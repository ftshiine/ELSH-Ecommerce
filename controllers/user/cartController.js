import Cart from '../../models/Cart.js';
import Product from '../../models/Product.js';
import Wishlist from '../../models/Wishlist.js';


export const loadCart = async (req, res) => {
    try {
        const userId = req.session.user.id || req.session.user._id;

        let cart = await Cart.findOne({ user: userId }).populate({
            path: 'items.product',
            populate: { path: 'category' }
        });

        if (!cart) {
            cart = { items: [], cartTotal: 0 };
        } else {
            let cartModified = false;
            let newTotal = 0;
            const validItems = [];
            let stockAdjustedMessages = [];

            for (const item of cart.items) {
                if (item.product && item.product.isListed) {
                    const variant = (item.product.variants && item.product.variants.length > 0) ? (item.product.variants.find(v => v.size === item.variantSize) || item.product.variants[0]) : { stock: item.product.stock || 0, salePrice: item.product.salePrice, regularPrice: item.product.regularPrice || 0 };

                    if (item.quantity > variant.stock) {
                        item.quantity = variant.stock;
                        cartModified = true;
                        if (item.quantity === 0) {
                            stockAdjustedMessages.push(`'${item.product.name} (${item.variantSize || 'Default'})' is out of stock and was removed from your cart.`);
                        } else {
                            stockAdjustedMessages.push(`Quantity for '${item.product.name} (${item.variantSize || 'Default'})' was reduced to ${item.quantity} due to limited stock.`);
                        }
                    }

                    if (item.quantity > 0) {
                        const effectivePrice = variant.salePrice && variant.salePrice < variant.regularPrice
                            ? variant.salePrice
                            : variant.regularPrice;

                        item.price = effectivePrice;
                        item.totalPrice = effectivePrice * item.quantity;
                        newTotal += item.totalPrice;
                        validItems.push(item);
                    }
                } else {
                    cartModified = true;
                }
            }

            if (cartModified || cart.cartTotal !== newTotal) {
                cart.items = validItems;
                cart.cartTotal = newTotal;
                await cart.save();
            }
            
            // attach messages to res.locals so we can use them in view
            res.locals.stockAdjustedMessages = stockAdjustedMessages;
        }

        const relatedProducts = await Product.find({ isListed: true }).populate('category').limit(4).sort({ isFeatured: -1, createdAt: -1 });

        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Cart', url: '/cart' }
        ];

        res.render('user/cart/index', {
            title: 'Your Cart',
            cart,
            relatedProducts,
            breadcrumbs,
            stockAdjustedMessages: res.locals.stockAdjustedMessages || []
        });
    } catch (error) {
        console.error('Error loading cart page:', error);
        res.status(500).send('Internal Server Error');
    }
};

//Add to cart
export const addToCart = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user.id || req.session.user._id;
        let quantity = parseInt(req.body.quantity);
        if (isNaN(quantity) || quantity < 1) quantity = 1;

        if (quantity > 5) {
            return res.status(400).json({ success: false, message: 'Maximum 5 items allowed per product.' });
        }

        const product = await Product.findById(productId);

        if (!product || !product.isListed) {
            return res.status(404).json({ success: false, message: 'Product is unavailable.' });
        }

        const variantSize = req.body.variantSize;
        const variant = (product.variants && product.variants.length > 0) ? (product.variants.find(v => v.size === variantSize) || product.variants[0]) : { stock: product.stock || 0, salePrice: product.salePrice, regularPrice: product.regularPrice || 0, size: 'Default' };

        if (variant.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Not enough stock available.' });
        }

        const effectivePrice = variant.salePrice && variant.salePrice < variant.regularPrice
            ? variant.salePrice
            : variant.regularPrice;

        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = new Cart({
                user: userId,
                items: [{
                    product: productId,
                    variantSize: variant.size,
                    quantity: quantity,
                    price: effectivePrice,
                    totalPrice: effectivePrice * quantity
                }],
                cartTotal: effectivePrice * quantity
            });
        } else {
            const itemIndex = cart.items.findIndex(item => item.product.toString() === productId && (item.variantSize === variant.size || (!item.variantSize && variant.size === 'Default')));

            if (itemIndex > -1) {

                const newQuantity = cart.items[itemIndex].quantity + quantity;

                if (newQuantity > 5) {
                    return res.status(400).json({ success: false, message: 'Maximum 5 items allowed per product.' });
                }

                if (variant.stock < newQuantity) {
                    return res.status(400).json({ success: false, message: 'Not enough stock available.' });
                }

                cart.items[itemIndex].quantity = newQuantity;
                cart.items[itemIndex].price = effectivePrice;
                cart.items[itemIndex].totalPrice = newQuantity * effectivePrice;
            } else {

                cart.items.push({
                    product: productId,
                    variantSize: variant.size,
                    quantity: quantity,
                    price: effectivePrice,
                    totalPrice: effectivePrice * quantity
                });
            }

            cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        }

        await cart.save();

        // Also remove from wishlist if it's there
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

        res.status(200).json({ success: true, message: 'Product added to cart successfully.' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Too many requests. Please try again.' });
        }
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};


//update quantity of product
export const updateQuantity = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user.id || req.session.user._id;
        const action = req.body.action;
        const variantSize = req.body.variantSize;

        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found.' });
        }

        const itemIndex = cart.items.findIndex(item => item.product._id.toString() === productId && (item.variantSize === variantSize || (!item.variantSize && !variantSize)));
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product not found in cart.' });
        }

        const item = cart.items[itemIndex];
        let newQuantity = item.quantity;

        if (action === 'increment') {
            newQuantity += 1;
        } else if (action === 'decrement') {
            newQuantity -= 1;
        } else {
            return res.status(400).json({ success: false, message: 'Invalid action.' });
        }

        if (newQuantity < 1) {
            return res.status(400).json({ success: false, message: 'Quantity cannot be less than 1.' });
        }

        if (newQuantity > 5) {
            return res.status(400).json({ success: false, message: 'Maximum 5 items allowed per product.' });
        }

        const variant = (item.product.variants && item.product.variants.length > 0) ? (item.product.variants.find(v => v.size === item.variantSize) || item.product.variants[0]) : { stock: item.product.stock || 0 };

        if (variant.stock < newQuantity) {
            if (action === 'increment') {
                return res.status(400).json({ success: false, message: 'Not enough stock available.' });
            } else {
                newQuantity = variant.stock;
            }
        }

        // Update item
        cart.items[itemIndex].quantity = newQuantity;
        cart.items[itemIndex].totalPrice = newQuantity * item.price;

        // Recalculate total
        cart.cartTotal = cart.items.reduce((total, i) => total + i.totalPrice, 0);

        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Quantity updated.',
            newQuantity: newQuantity,
            itemTotalPrice: cart.items[itemIndex].totalPrice,
            cartTotal: cart.cartTotal
        });

    } catch (error) {
        console.error('Error updating cart quantity:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};


//Remove product from cart
export const removeFromCart = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user.id || req.session.user._id;
        const variantSize = req.body.variantSize;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found.' });
        }

        cart.items = cart.items.filter(item => !(item.product.toString() === productId && (item.variantSize === variantSize || (!item.variantSize && !variantSize))));

        cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);

        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Product removed from cart.',
            cartTotal: cart.cartTotal,
            itemCount: cart.items.length
        });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
