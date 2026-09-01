import Cart from '../../models/Cart.js';
import Address from '../../models/Address.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import Wallet from '../../models/Wallet.js';
import Coupon from '../../models/Coupon.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { STATUS_CODES } from '../../constants/index.js';

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const prepareCheckoutData = async ({ userId, checkoutType, directItem, directCouponId, addressId }) => {
    let cart;

    if (checkoutType === 'direct') {
        if (!directItem) {
            return { redirectCart: true };
        }
        const product = await Product.findById(directItem.productId);
        if (!product) {
            return { redirectCart: true };
        }
        const variant = product.variants.find(v => v.size === directItem.variantSize) || product.variants[0];
        const price = Math.min(
            variant.regularPrice,
            (variant.salePrice > 0 ? variant.salePrice : variant.regularPrice),
            (variant.offerPrice > 0 ? variant.offerPrice : variant.regularPrice)
        );

        cart = {
            items: [{
                product: product,
                variantSize: directItem.variantSize,
                quantity: directItem.quantity,
                price: price,
                totalPrice: price * directItem.quantity
            }],
            cartTotal: price * directItem.quantity
        };

        if (directCouponId) {
            const coupon = await Coupon.findById(directCouponId);
            if (coupon && coupon.isActive) {
                cart.appliedCoupon = coupon;
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
                if (eligibleTotal >= coupon.minPurchaseAmount) {
                    let discount = 0;
                    if (coupon.discountType === 'percentage') {
                        discount = Math.ceil((eligibleTotal * coupon.discountValue) / 100);
                        if (coupon.maxDiscountLimit && discount > coupon.maxDiscountLimit) {
                            discount = coupon.maxDiscountLimit;
                        }
                    } else {
                        discount = coupon.discountValue;
                    }
                    cart.discountAmount = Math.min(discount, eligibleTotal);
                }
            }
        }
    } else {
        cart = await Cart.findOne({ user: userId }).populate('items.product').populate('appliedCoupon');
        if (!cart || cart.items.length === 0) {
            return { redirectCart: true };
        }
    }

    let selectedAddress = null;
    if (addressId) {
        selectedAddress = await Address.findOne({ _id: addressId, userId });
    }

    if (!selectedAddress) {
        const addresses = await Address.find({ userId }).sort({ isPrimary: -1, createdAt: -1 }).limit(1);
        if (addresses.length > 0) {
            selectedAddress = addresses[0];
        }
    }

    const wallet = await Wallet.findOne({ user: userId });
    const walletBalance = wallet ? wallet.balance : 0;

    return {
        cart,
        selectedAddress,
        walletBalance,
        checkoutType
    };
};

export const startDirectCheckout = async ({ userId, productId, variantSize, quantity }) => {
    let cart = await Cart.findOne({ user: userId });
    if (cart) {
        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId && item.variantSize === variantSize
        );
        if (itemIndex > -1) {
            cart.items.splice(itemIndex, 1);
            cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
            await cart.save();
        }
    }

    return { productId, variantSize, quantity };
};

export const processOrderPlacement = async ({
    userId,
    addressId,
    paymentMethod,
    checkoutType,
    useWallet,
    directItem,
    directCouponId
}) => {
    let successfullyDecremented = [];

    if (!addressId) {
        const error = new Error('Please select a delivery address.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    if (!['COD', 'Razorpay', 'Wallet'].includes(paymentMethod)) {
        const error = new Error('Invalid payment method selected.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const address = await Address.findById(addressId);
    if (!address || address.userId.toString() !== userId.toString()) {
        const error = new Error('Invalid address selected.');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    let cart;
    if (checkoutType === 'direct') {
        if (!directItem) {
            const error = new Error('Direct checkout session expired.');
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        }
        const product = await Product.findById(directItem.productId);
        if (!product) {
            const error = new Error('Product is no longer available.');
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        }
        const variant = product.variants.find(v => v.size === directItem.variantSize) || product.variants[0];
        const price = variant.salePrice && variant.salePrice < variant.regularPrice ? variant.salePrice : variant.regularPrice;
        cart = {
            items: [{
                product: product,
                variantSize: directItem.variantSize,
                quantity: directItem.quantity,
                price: price,
                totalPrice: price * directItem.quantity
            }]
        };

        if (directCouponId) {
            const coupon = await Coupon.findById(directCouponId);
            if (coupon && coupon.isActive) {
                cart.appliedCoupon = coupon;
            }
        }
    } else {
        cart = await Cart.findOne({ user: userId }).populate('items.product').populate('appliedCoupon');
        if (!cart || cart.items.length === 0) {
            const error = new Error('Your cart is empty.');
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        }
    }

    // Calculate total and prepare order items
    const orderItems = [];
    let totalAmount = 0;

    for (const item of cart.items) {
        const product = item.product;
        if (!product) {
            const error = new Error('One or more items in your cart are no longer available.');
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        }

        const variant = product.variants.find(v => v.size === item.variantSize) || product.variants[0];

        if (variant.stock < item.quantity) {
            const error = new Error(`Sorry, ${product.name} (${item.variantSize || 'Default'}) is out of stock.`);
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        }

        orderItems.push({
            product: product._id,
            variant: variant._id,
            productName: product.name,
            variantName: item.variantSize,
            price: item.price,
            quantity: item.quantity,
            thumbnail: variant && variant.images.length > 0 ? variant.images[0].replace(/^public[\\/]/, '/') : '',
            itemTotal: item.totalPrice,
            returnWindowDays: product.returnWindowDays !== undefined ? product.returnWindowDays : 7
        });
        totalAmount += item.totalPrice;
    }

    const subtotal = totalAmount;
    const shippingFee = 0;
    const estimatedTax = subtotal * 0.08;

    // Coupon Logic
    let discount = 0;
    let appliedCouponCode = null;
    let appliedCouponObj = null;

    if (cart && cart.appliedCoupon && cart.appliedCoupon.isActive) {
        const coupon = cart.appliedCoupon;
        const now = new Date();

        let isValid = true;
        if (coupon.startDate > now) isValid = false;
        if (coupon.endDate && coupon.endDate < now) isValid = false;
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) isValid = false;
        if (coupon.limitPerUser && coupon.usedBy.includes(userId)) isValid = false;

        let eligibleTotal = 0;
        if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
            const applicableCatStrings = coupon.applicableCategories.map(c => c.toString());
            for (const item of cart.items) {
                if (item.product && item.product.category && applicableCatStrings.includes(item.product.category.toString())) {
                    eligibleTotal += item.totalPrice;
                }
            }
        } else {
            eligibleTotal = subtotal;
        }

        if (eligibleTotal === 0) isValid = false;
        if (eligibleTotal < coupon.minPurchaseAmount) isValid = false;

        if (isValid) {
            let calculatedDiscount = 0;
            if (coupon.discountType === 'percentage') {
                calculatedDiscount = Math.ceil((eligibleTotal * coupon.discountValue) / 100);
                if (coupon.maxDiscountLimit && calculatedDiscount > coupon.maxDiscountLimit) {
                    calculatedDiscount = coupon.maxDiscountLimit;
                }
            } else {
                calculatedDiscount = coupon.discountValue;
                if (coupon.maxDiscountLimit && calculatedDiscount > coupon.maxDiscountLimit) {
                    calculatedDiscount = coupon.maxDiscountLimit;
                }
            }
            calculatedDiscount = Math.min(calculatedDiscount, eligibleTotal);

            discount = calculatedDiscount;
            appliedCouponCode = coupon.code;
            appliedCouponObj = coupon;
        }
    }

    const finalTotal = subtotal + shippingFee + estimatedTax - discount;

    let actualPaymentMethod = paymentMethod;
    let walletAmountUsed = 0;
    let amountToPayOnline = finalTotal;
    let paymentStatus = 'PENDING';

    const wallet = useWallet ? await Wallet.findOne({ user: userId }) : null;
    const walletBalance = wallet ? wallet.balance : 0;

    if (useWallet && walletBalance > 0) {
        walletAmountUsed = Math.min(finalTotal, walletBalance);
        amountToPayOnline = finalTotal - walletAmountUsed;

        if (amountToPayOnline === 0) {
            actualPaymentMethod = 'Wallet';
            paymentStatus = 'PAID';
        } else {
            actualPaymentMethod = 'Wallet + Razorpay';
            if (paymentMethod === 'COD') {
                const error = new Error('COD is not allowed for partial wallet payments.');
                error.statusCode = STATUS_CODES.BAD_REQUEST;
                throw error;
            }
        }
    }

    try {
        if (actualPaymentMethod === 'COD' || actualPaymentMethod === 'Wallet') {
            for (const item of orderItems) {
                const updateResult = await Product.updateOne(
                    { _id: item.product, 'variants._id': item.variant, 'variants.stock': { $gte: item.quantity } },
                    { $inc: { 'variants.$.stock': -item.quantity } }
                );

                if (updateResult.modifiedCount === 0) {
                    for (const decItem of successfullyDecremented) {
                        await Product.updateOne(
                            { _id: decItem.productId, 'variants._id': decItem.variantId },
                            { $inc: { 'variants.$.stock': decItem.quantity } }
                        );
                    }
                    const error = new Error(`Sorry, ${item.productName} is out of stock.`);
                    error.statusCode = STATUS_CODES.BAD_REQUEST;
                    throw error;
                }
                successfullyDecremented.push({ productId: item.product, variantId: item.variant, quantity: item.quantity });
            }

            if (actualPaymentMethod === 'Wallet' && walletAmountUsed > 0 && wallet) {
                wallet.balance -= walletAmountUsed;
                wallet.transactions.push({
                    amount: walletAmountUsed,
                    type: 'DEBIT',
                    description: `Payment for Order`
                });
                await wallet.save();
            }
        }

        const newOrder = new Order({
            user: userId,
            items: orderItems,
            shippingAddress: {
                fullName: address.fullName,
                phone: address.phone,
                addressLine1: address.addressLine1,
                addressLine2: address.landmark || '',
                city: address.city,
                state: address.state,
                postalCode: address.pincode,
                country: address.country
            },
            paymentInfo: {
                method: actualPaymentMethod,
                status: paymentStatus,
                walletAmountUsed: walletAmountUsed
            },
            orderStatus: (paymentStatus === 'PAID' || actualPaymentMethod === 'COD') ? 'PROCESSING' : 'PENDING',
            pricing: {
                subtotal: subtotal,
                shippingFee: shippingFee,
                discount: discount,
                couponCode: appliedCouponCode,
                totalAmount: finalTotal
            }
        });

        if (appliedCouponObj && (actualPaymentMethod === 'COD' || actualPaymentMethod === 'Wallet')) {
            appliedCouponObj.usedCount += 1;
            if (appliedCouponObj.limitPerUser) {
                appliedCouponObj.usedBy.push(userId);
            }
            await appliedCouponObj.save();
        }

        await newOrder.save();

        if (useWallet && walletAmountUsed > 0) {
            const userWallet = await Wallet.findOne({ user: userId });
            if (userWallet && userWallet.transactions.length > 0) {
                const lastTransaction = userWallet.transactions[userWallet.transactions.length - 1];
                lastTransaction.description = `Payment for Order #${newOrder.orderId}`;
                await userWallet.save();
            }
        }

        if (checkoutType !== 'direct') {
            cart.items = [];
            cart.cartTotal = 0;
            await cart.save();
        }

        if (actualPaymentMethod === 'Razorpay' || actualPaymentMethod === 'Wallet + Razorpay') {
            const options = {
                amount: Math.round(amountToPayOnline * 100),
                currency: 'INR',
                receipt: newOrder._id.toString()
            };

            const razorpayOrder = await razorpayInstance.orders.create(options);
            return {
                success: true,
                orderId: newOrder._id,
                razorpayOrderId: razorpayOrder.id,
                key: process.env.RAZORPAY_KEY_ID,
                amount: options.amount
            };
        }

        return { success: true, orderId: newOrder._id };

    } catch (orderError) {
        for (const decItem of successfullyDecremented) {
            try {
                await Product.updateOne(
                    { _id: decItem.productId, 'variants._id': decItem.variantId },
                    { $inc: { 'variants.$.stock': decItem.quantity } }
                );
            } catch (rbErr) {
                console.error('Critical Error: Failed to rollback stock:', rbErr);
            }
        }
        throw orderError;
    }
};

export const verifyPaymentSignatureAndFulfill = async ({
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    orderId
}) => {
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(sign.toString())
        .digest("hex");

    if (razorpay_signature !== expectedSign) {
        const error = new Error('Invalid payment signature');
        error.statusCode = STATUS_CODES.BAD_REQUEST;
        throw error;
    }

    const order = await Order.findById(orderId);
    if (!order) {
        const error = new Error('Order not found');
        error.statusCode = STATUS_CODES.NOT_FOUND;
        throw error;
    }

    if (order.paymentInfo.status === 'PAID') {
        return { success: true, message: 'Payment already verified' };
    }

    let stockAvailable = true;
    for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (!product) { stockAvailable = false; break; }
        const variant = product.variants.id(item.variant);
        if (!variant || variant.stock < item.quantity) {
            stockAvailable = false;
            break;
        }
    }

    if (stockAvailable) {
        for (const item of order.items) {
            await Product.updateOne(
                { _id: item.product, 'variants._id': item.variant },
                { $inc: { 'variants.$.stock': -item.quantity } }
            );
        }

        if (order.paymentInfo.walletAmountUsed > 0) {
            const wallet = await Wallet.findOne({ user: order.user });
            if (wallet) {
                wallet.balance -= order.paymentInfo.walletAmountUsed;
                wallet.transactions.push({
                    amount: order.paymentInfo.walletAmountUsed,
                    type: 'DEBIT',
                    description: `Payment for Order #${order.orderId}`
                });
                await wallet.save();
            }
        }

        order.paymentInfo.status = 'PAID';
        order.paymentInfo.transactionId = razorpay_payment_id;
        order.orderStatus = 'PROCESSING';

        if (order.pricing.couponCode) {
            const coupon = await Coupon.findOne({ code: order.pricing.couponCode });
            if (coupon) {
                coupon.usedCount += 1;
                if (coupon.limitPerUser && !coupon.usedBy.includes(order.user)) {
                    coupon.usedBy.push(order.user);
                }
                await coupon.save();
            }
        }

        await order.save();
        return { success: true, message: 'Payment verified successfully' };

    } else {
        const razorpayPaidAmount = order.pricing.totalAmount - order.paymentInfo.walletAmountUsed;

        let wallet = await Wallet.findOne({ user: order.user });
        if (!wallet) {
            wallet = new Wallet({ user: order.user, balance: 0, totalRefunds: 0, transactions: [] });
        }

        wallet.balance += razorpayPaidAmount;
        wallet.totalRefunds += razorpayPaidAmount;
        wallet.transactions.push({
            amount: razorpayPaidAmount,
            type: 'CREDIT',
            description: `Refund for out of stock items (Order #${order.orderId})`
        });
        await wallet.save();

        order.orderStatus = 'CANCELLED';
        order.paymentInfo.status = 'FAILED';
        order.items.forEach(item => item.itemStatus = 'CANCELLED');
        order.cancellationReason = 'Automatic cancellation: Items went out of stock during payment. Refund credited to Wallet.';
        await order.save();

        return {
            success: false,
            message: 'Sorry, the item went out of stock while you were paying. Your payment has been refunded to your Store Wallet.',
            oversold: true
        };
    }
};

export const applyCheckoutCoupon = async ({ userId, code, checkoutType, directItem }) => {
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

    let cart;
    let eligibleTotal = 0;

    if (checkoutType === 'direct') {
        if (!directItem) {
            const error = new Error('Direct checkout session expired.');
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        }

        const product = await Product.findById(directItem.productId);
        if (!product) {
            const error = new Error('Product is no longer available.');
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        }

        const variant = product.variants.find(v => v.size === directItem.variantSize) || product.variants[0];
        const price = variant.salePrice && variant.salePrice < variant.regularPrice ? variant.salePrice : variant.regularPrice;

        cart = {
            items: [{
                product: product,
                variantSize: directItem.variantSize,
                quantity: directItem.quantity,
                price: price,
                totalPrice: price * directItem.quantity
            }],
            cartTotal: price * directItem.quantity
        };
    } else {
        cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            const error = new Error('Your cart is empty.');
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        }
    }

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
        const error = new Error('This coupon is not applicable to any items in your checkout.');
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
        discount = (eligibleTotal * coupon.discountValue) / 100;
        if (coupon.maxDiscountLimit && discount > coupon.maxDiscountLimit) {
            discount = coupon.maxDiscountLimit;
        }
    } else {
        discount = coupon.discountValue;
    }
    discount = Math.min(discount, eligibleTotal);

    if (checkoutType !== 'direct') {
        cart.appliedCoupon = coupon._id;
        cart.discountAmount = discount;
        await cart.save();
    }

    return {
        couponId: coupon._id,
        discountAmount: discount
    };
};

export const removeCheckoutCoupon = async ({ userId, checkoutType }) => {
    if (checkoutType !== 'direct') {
        const cart = await Cart.findOne({ user: userId });
        if (cart) {
            cart.appliedCoupon = null;
            cart.discountAmount = 0;
            await cart.save();
        }
    }
    return true;
};

export const getOrderByIdForUser = async (orderId, userId) => {
    return await Order.findOne({ _id: orderId, user: userId });
};
