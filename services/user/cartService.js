import Cart from '../../models/Cart.js';
import Product from '../../models/Product.js';
import Wishlist from '../../models/Wishlist.js';
import Coupon from '../../models/Coupon.js';
import Order from '../../models/Order.js';
import { STATUS_CODES } from '../../constants/index.js';

export const getCart = async (userId) => {
    let cart = await Cart.findOne({ user: userId })
        .populate({
            path: 'items.product',
            populate: { path: 'category' }
        })
        .populate('appliedCoupon');

    if (!cart) {
        return { cart: { items: [], cartTotal: 0 }, stockAdjustedMessages: [] };
    }

    let stockAdjusted = false;
    let newTotal = 0;
    const listedItems = [];
    const unavailableItems = [];
    const stockAdjustedMessages = [];

    for (const item of cart.items) {
        // Product deleted or unlisted — preserve in DB, track for the return below.
        if (!item.product || !item.product.isListed) {
            unavailableItems.push(item);
            continue;
        }

        const variant = (item.product.variants && item.product.variants.length > 0)
            ? (item.product.variants.find(v => v.size === item.variantSize) || item.product.variants[0])
            : { stock: item.product.stock || 0, salePrice: item.product.salePrice, regularPrice: item.product.regularPrice || 0 };

        if (item.quantity > variant.stock) {
            item.quantity = variant.stock;
            stockAdjusted = true;
            if (item.quantity === 0) {
                stockAdjustedMessages.push(`'${item.product.name} (${item.variantSize || 'Default'})' is out of stock and was removed from your cart.`);
            } else {
                stockAdjustedMessages.push(`Quantity for '${item.product.name} (${item.variantSize || 'Default'})' was reduced to ${item.quantity} due to limited stock.`);
            }
        }

        if (item.quantity > 0) {
            const effectivePrice = Math.min(
                variant.regularPrice,
                (variant.salePrice > 0 ? variant.salePrice : variant.regularPrice),
                (variant.offerPrice > 0 ? variant.offerPrice : variant.regularPrice)
            );

            item.price = effectivePrice;
            item.totalPrice = effectivePrice * item.quantity;
            newTotal += item.totalPrice;
            listedItems.push(item);
        }
    }

    // Only persist when stock quantities actually changed.
    // Unlisted/unavailable items are always preserved in DB — never deleted here.
    if (stockAdjusted || cart.cartTotal !== newTotal) {
        cart.items = [...listedItems, ...unavailableItems];
        cart.cartTotal = newTotal;
        await cart.save();
    }

    // Mongoose strict mode blocks reading non-schema properties via normal
    // property access (item.isUnavailable returns undefined even with _doc mutation).
    // Converting to a plain JS object first means EJS reads all properties directly.
    const unavailableIds = new Set(unavailableItems.map(i => i._id.toString()));
    const cartPlain = cart.toObject({ virtuals: true });
    cartPlain.items = cartPlain.items.map(item => ({
        ...item,
        isUnavailable: unavailableIds.has(item._id.toString())
    }));

    return { cart: cartPlain, stockAdjustedMessages };
};

export const getCartRelatedProducts = async () => {
    return await Product.find({ isListed: true })
        .populate('category')
        .limit(4)
        .sort({ isFeatured: -1, createdAt: -1 });
};

export const addToCart = async ({ userId, productId, variantSize, quantity = 1 }) => {
    let qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) qty = 1;

    if (qty > 5) {
        const error = new Error('Maximum 5 items allowed per product.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const product = await Product.findById(productId);
    if (!product || !product.isListed) {
        const error = new Error('Product is unavailable.');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    const variant = (product.variants && product.variants.length > 0)
        ? (product.variants.find(v => v.size === variantSize) || product.variants[0])
        : { stock: product.stock || 0, salePrice: product.salePrice, regularPrice: product.regularPrice || 0, size: 'Default' };

    if (variant.stock < qty) {
        const error = new Error('Not enough stock available.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const effectivePrice = Math.min(
        variant.regularPrice,
        (variant.salePrice > 0 ? variant.salePrice : variant.regularPrice),
        (variant.offerPrice > 0 ? variant.offerPrice : variant.regularPrice)
    );

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
        cart = new Cart({
            user: userId,
            items: [{
                product: productId,
                variantSize: variant.size,
                quantity: qty,
                price: effectivePrice,
                totalPrice: effectivePrice * qty
            }],
            cartTotal: effectivePrice * qty
        });
    } else {
        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId && (item.variantSize === variant.size || (!item.variantSize && variant.size === 'Default')));

        if (itemIndex > -1) {
            const newQuantity = cart.items[itemIndex].quantity + qty;

            if (newQuantity > 5) {
                const error = new Error('Maximum 5 items allowed per product.');
                error.statusCode = STATUS_CODES.BAD_REQUEST;
                throw error;
            }

            if (variant.stock < newQuantity) {
                const error = new Error('Not enough stock available.');
                error.statusCode = STATUS_CODES.BAD_REQUEST;
                throw error;
            }

            cart.items[itemIndex].quantity = newQuantity;
            cart.items[itemIndex].price = effectivePrice;
            cart.items[itemIndex].totalPrice = newQuantity * effectivePrice;
        } else {
            cart.items.push({
                product: productId,
                variantSize: variant.size,
                quantity: qty,
                price: effectivePrice,
                totalPrice: effectivePrice * qty
            });
        }

        cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
    }

    await cart.save();

    // Clean up wishlist
    try {
        const wishlist = await Wishlist.findOne({ user: userId });
        if (wishlist) {
            const initialLength = wishlist.items.length;
            wishlist.items = wishlist.items.filter(item => item.product.toString() !== productId);
            if (wishlist.items.length !== initialLength) {
                await wishlist.save();
            }
        }
    } catch (wishlistErr) {
        console.error('Error removing from wishlist after adding to cart:', wishlistErr);
    }

    return cart;
};

export const updateCartQuantity = async ({ userId, productId, variantSize, action }) => {
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart) {
        const error = new Error('Cart not found.');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    const itemIndex = cart.items.findIndex(item => item.product._id.toString() === productId && (item.variantSize === variantSize || (!item.variantSize && !variantSize)));
    if (itemIndex === -1) {
        const error = new Error('Product not found in cart.');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    const item = cart.items[itemIndex];
    let newQuantity = item.quantity;

    if (action === 'increment') {
        newQuantity += 1;
    } else if (action === 'decrement') {
        newQuantity -= 1;
    } else {
        const error = new Error('Invalid action.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    if (newQuantity < 1) {
        const error = new Error('Quantity cannot be less than 1.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    if (newQuantity > 5) {
        const error = new Error('Maximum 5 items allowed per product.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const variant = (item.product.variants && item.product.variants.length > 0)
        ? (item.product.variants.find(v => v.size === item.variantSize) || item.product.variants[0])
        : { stock: item.product.stock || 0 };

    if (variant.stock < newQuantity) {
        if (action === 'increment') {
            const error = new Error('Not enough stock available.');
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        } else {
            newQuantity = variant.stock;
        }
    }

    cart.items[itemIndex].quantity = newQuantity;
    cart.items[itemIndex].totalPrice = newQuantity * item.price;
    cart.cartTotal = cart.items.reduce((total, i) => total + i.totalPrice, 0);

    await cart.save();

    return {
        newQuantity,
        itemTotalPrice: cart.items[itemIndex].totalPrice,
        cartTotal: cart.cartTotal
    };
};

export const removeFromCart = async ({ userId, productId, variantSize }) => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        const error = new Error('Cart not found.');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    cart.items = cart.items.filter(item => !(item.product.toString() === productId && (item.variantSize === variantSize || (!item.variantSize && !variantSize))));
    cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);

    await cart.save();

    return {
        cartTotal: cart.cartTotal,
        itemCount: cart.items.length
    };
};

export const applyCouponToCart = async ({ userId, code }) => {
    if (!code) {
        const error = new Error('Coupon code is required.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) {
        const error = new Error('Invalid or inactive coupon code.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const now = new Date();
    if (coupon.startDate > now) {
        const error = new Error('Coupon is not active yet.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }
    if (coupon.endDate && coupon.endDate < now) {
        const error = new Error('Coupon has expired.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        const error = new Error('Coupon usage limit reached.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }
    if (coupon.limitPerUser && coupon.usedBy.includes(userId)) {
        const error = new Error('You have already used this coupon.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    if (coupon.isFirstPurchaseOnly) {
        const previousOrdersCount = await Order.countDocuments({ user: userId, orderStatus: { $ne: 'CANCELLED' } });
        if (previousOrdersCount > 0) {
            const error = new Error('This promotional code is reserved for first-time purchases only.');
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        }
    }

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
        const error = new Error('Your cart is empty.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    let eligibleTotal = 0;
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
        const applicableCatStrings = coupon.applicableCategories.map(c => c.toString());
        for (const item of cart.items) {
            if (item.product && item.product.category && applicableCatStrings.includes(item.product.category.toString())) {
                eligibleTotal += item.totalPrice;
            }
        }
    } else {
        eligibleTotal = cart.cartTotal;
    }

    if (eligibleTotal === 0) {
        const error = new Error('This coupon is not applicable to any items in your cart.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    if (eligibleTotal < coupon.minPurchaseAmount) {
        const error = new Error(`Minimum purchase amount of ₹${coupon.minPurchaseAmount} of eligible items required.`);
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
        discount = Math.ceil((eligibleTotal * coupon.discountValue) / 100);
        if (coupon.maxDiscountLimit && discount > coupon.maxDiscountLimit) {
            discount = coupon.maxDiscountLimit;
        }
    } else {
        discount = coupon.discountValue;
        if (coupon.maxDiscountLimit && discount > coupon.maxDiscountLimit) {
            discount = coupon.maxDiscountLimit;
        }
    }

    discount = Math.min(discount, eligibleTotal);

    cart.appliedCoupon = coupon._id;
    cart.discountAmount = discount;
    await cart.save();

    return {
        discountAmount: discount,
        newTotal: cart.cartTotal - discount
    };
};

export const removeCouponFromCart = async (userId) => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        const error = new Error('Cart not found.');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    cart.appliedCoupon = null;
    cart.discountAmount = 0;
    await cart.save();

    return { newTotal: cart.cartTotal };
};
