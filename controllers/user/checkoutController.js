import Cart from '../../models/Cart.js';
import Address from '../../models/Address.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import Wallet from '../../models/Wallet.js';
import Coupon from '../../models/Coupon.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user.id;

    let cart;
    const checkoutType = req.query.type === 'direct' ? 'direct' : 'cart';

    if (checkoutType === 'direct') {
      const directItem = req.session.directCheckoutItem;
      if (!directItem) {
        return res.redirect('/cart');
      }
      const product = await Product.findById(directItem.productId);
      if (!product) {
        return res.redirect('/cart');
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

      if (req.session.directCheckoutCoupon) {
        const coupon = await Coupon.findById(req.session.directCheckoutCoupon);
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
        return res.redirect('/cart');
      }
    }

    let selectedAddress = null;
    if (req.query.addressId) {
      selectedAddress = await Address.findOne({ _id: req.query.addressId, userId });
    }

    if (!selectedAddress) {
      const addresses = await Address.find({ userId }).sort({ isPrimary: -1, createdAt: -1 }).limit(1);
      if (addresses.length > 0) {
        selectedAddress = addresses[0];
      }
    }

    const breadcrumbs = [
      { name: 'Home', url: '/home' },
      { name: 'Shop', url: '/shop' },
      { name: 'Checkout', url: '/checkout' }
    ];

    // Fetch user wallet
    const wallet = await Wallet.findOne({ user: userId });
    const walletBalance = wallet ? wallet.balance : 0;

    res.render('user/checkout/index', {
      title: 'Checkout',
      cart,
      selectedAddress,
      breadcrumbs,
      checkoutType,
      walletBalance
    });
  } catch (error) {
    console.error('Error loading checkout:', error);
    res.redirect('/cart');
  }
};

export const placeOrder = async (req, res) => {
  let successfullyDecremented = [];
  try {
    const userId = req.session.user.id;
    const { addressId, paymentMethod, checkoutType, useWallet } = req.body;

    if (!addressId) {
      return res.status(400).json({ success: false, message: 'Please select a delivery address.' });
    }

    if (!['COD', 'Razorpay', 'Wallet'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method selected.' });
    }

    const address = await Address.findById(addressId);
    if (!address || address.userId.toString() !== userId.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid address selected.' });
    }

    let cart;
    if (checkoutType === 'direct') {
      const directItem = req.session.directCheckoutItem;
      if (!directItem) {
        return res.status(400).json({ success: false, message: 'Direct checkout session expired.' });
      }
      const product = await Product.findById(directItem.productId);
      if (!product) {
        return res.status(400).json({ success: false, message: 'Product is no longer available.' });
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
      
      if (req.session.directCheckoutCoupon) {
        const coupon = await Coupon.findById(req.session.directCheckoutCoupon);
        if (coupon && coupon.isActive) {
          cart.appliedCoupon = coupon;
        }
      }
    } else {
      cart = await Cart.findOne({ user: userId }).populate('items.product').populate('appliedCoupon');
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: 'Your cart is empty.' });
      }
    }

    // Calculate total and prepare order items
    const orderItems = [];
    let totalAmount = 0;

    for (const item of cart.items) {
      const product = item.product;
      if (!product) {
        return res.status(400).json({ success: false, message: 'One or more items in your cart are no longer available.' });
      }

      const variant = product.variants.find(v => v.size === item.variantSize) || product.variants[0];

      if (variant.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Sorry, ${product.name} (${item.variantSize || 'Default'}) is out of stock.` });
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

    // Taxes & Shipping logic 
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

        // Calculate eligible total for category logic
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
          return res.status(400).json({ success: false, message: 'COD is not allowed for partial wallet payments.' });
        }
      }
    }

    // Lazy Stock/Wallet Deduction: Only deduct immediately if fully paid or COD
    if (actualPaymentMethod === 'COD' || actualPaymentMethod === 'Wallet') {
      // 1. Decrement Stock
      for (const item of orderItems) {
        const updateResult = await Product.updateOne(
          { _id: item.product, 'variants._id': item.variant, 'variants.stock': { $gte: item.quantity } },
          { $inc: { 'variants.$.stock': -item.quantity } }
        );

        if (updateResult.modifiedCount === 0) {
          // Rollback previously decremented items
          for (const decItem of successfullyDecremented) {
            await Product.updateOne(
              { _id: decItem.productId, 'variants._id': decItem.variantId },
              { $inc: { 'variants.$.stock': decItem.quantity } }
            );
          }
          return res.status(400).json({ success: false, message: `Sorry, ${item.productName} is out of stock.` });
        }
        successfullyDecremented.push({ productId: item.product, variantId: item.variant, quantity: item.quantity });
      }

      // 2. Deduct Wallet
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
      orderStatus: 'PENDING',
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

    // Update wallet description with OrderId
    if (useWallet && walletAmountUsed > 0) {
      const wallet = await Wallet.findOne({ user: userId });
      if (wallet && wallet.transactions.length > 0) {
        const lastTransaction = wallet.transactions[wallet.transactions.length - 1];
        lastTransaction.description = `Payment for Order #${newOrder.orderId}`;
        await wallet.save();
      }
    }

    if (checkoutType === 'direct') {
      req.session.directCheckoutItem = null;
    } else {
      cart.items = [];
      cart.cartTotal = 0;
      await cart.save();
    }

    if (actualPaymentMethod === 'Razorpay' || actualPaymentMethod === 'Wallet + Razorpay') {
      const options = {
        amount: Math.round(amountToPayOnline * 100), // Amount in paise
        currency: 'INR',
        receipt: newOrder._id.toString()
      };

      try {
        const razorpayOrder = await razorpayInstance.orders.create(options);
        return res.json({
          success: true,
          orderId: newOrder._id,
          razorpayOrderId: razorpayOrder.id,
          key: process.env.RAZORPAY_KEY_ID,
          amount: options.amount
        });
      } catch (rzpErr) {
        console.error('Razorpay creation error:', rzpErr);
        // Fallback to standard pending order if Razorpay fails to generate order
        return res.status(500).json({ success: false, message: 'Failed to initiate online payment.' });
      }
    }

    res.json({ success: true, orderId: newOrder._id });
  } catch (error) {
    console.error('Error placing order:', error);
    // Rollback decremented stock if order creation failed
    for (const decItem of successfullyDecremented) {
      try {
        await Product.updateOne(
          { _id: decItem.productId, 'variants._id': decItem.variantId },
          { $inc: { 'variants.$.stock': decItem.quantity } }
        );
      } catch (rollbackError) {
        console.error('Critical Error: Failed to rollback stock:', rollbackError);
      }
    }
    res.status(500).json({ success: false, message: error.message || 'An error occurred while placing your order.' });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Payment is verified
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (order.paymentInfo.status === 'PAID') {
        return res.json({ success: true, message: 'Payment already verified' });
      }

      // 1. Check stock for all items
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
        // 2. Decrement stock
        for (const item of order.items) {
          await Product.updateOne(
            { _id: item.product, 'variants._id': item.variant },
            { $inc: { 'variants.$.stock': -item.quantity } }
          );
        }

        // 3. Deduct Wallet if partial wallet was used
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

        // 4. Update Coupon Stats
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
        return res.json({ success: true, message: 'Payment verified successfully' });

      } else {
        // OVERSOLD: Stock is not available. Refund the Razorpay amount to the Store Wallet!
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

        return res.status(400).json({ 
          success: false, 
          message: 'Sorry, the item went out of stock while you were paying. Your payment has been refunded to your Store Wallet.',
          oversold: true
        });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};

export const loadSuccess = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.session.user.id });

    if (!order) {
      return res.redirect('/orders');
    }

    res.render('user/checkout/success', {
      title: 'Order Confirmed',
      order
    });
  } catch (error) {
    console.error('Error loading success page:', error);
    res.redirect('/orders');
  }
};

export const loadFailure = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.session.user.id });

    if (!order) {
      return res.redirect('/orders');
    }

    res.render('user/checkout/failure', {
      title: 'Payment Failed',
      order
    });
  } catch (error) {
    console.error('Error loading failure page:', error);
    res.redirect('/orders');
  }
};

export const startDirectCheckout = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { productId, variantSize, quantity } = req.body;


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


    req.session.directCheckoutItem = { productId, variantSize, quantity };
    req.session.directCheckoutCoupon = null; // Clear any old coupon

    res.json({ success: true });
  } catch (error) {
    console.error('Error in startDirectCheckout:', error);
    res.status(500).json({ success: false, message: 'Failed to start direct checkout' });
  }
};

export const applyCheckoutCoupon = async (req, res) => {
    try {
        const { code, checkoutType } = req.body;
        const userId = req.session.user.id || req.session.user._id;

        if (!code) {
            return res.status(400).json({ success: false, message: 'Coupon code is required.' });
        }

        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
        
        if (!coupon) {
            return res.status(400).json({ success: false, message: 'Invalid or inactive coupon code.' });
        }

        const now = new Date();
        if (coupon.startDate > now) {
            return res.status(400).json({ success: false, message: 'Coupon is not active yet.' });
        }
        if (coupon.endDate && coupon.endDate < now) {
            return res.status(400).json({ success: false, message: 'Coupon has expired.' });
        }
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' });
        }
        if (coupon.limitPerUser && coupon.usedBy.includes(userId)) {
            return res.status(400).json({ success: false, message: 'You have already used this coupon.' });
        }
        
        if (coupon.isFirstPurchaseOnly) {
            const previousOrdersCount = await Order.countDocuments({ user: userId, orderStatus: { $ne: 'CANCELLED' } });
            if (previousOrdersCount > 0) {
                return res.status(400).json({ success: false, message: 'This promotional code is reserved for first-time purchases only.' });
            }
        }

        let cart;
        let eligibleTotal = 0;

        if (checkoutType === 'direct') {
            const directItem = req.session.directCheckoutItem;
            if (!directItem) return res.status(400).json({ success: false, message: 'Direct checkout session expired.' });
            
            const product = await Product.findById(directItem.productId);
            if (!product) return res.status(400).json({ success: false, message: 'Product is no longer available.' });
            
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
                return res.status(400).json({ success: false, message: 'Your cart is empty.' });
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
            return res.status(400).json({ success: false, message: 'This coupon is not applicable to any items in your checkout.' });
        }

        if (eligibleTotal < coupon.minPurchaseAmount) {
            return res.status(400).json({ success: false, message: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} of eligible items required.` });
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

        if (checkoutType === 'direct') {
            req.session.directCheckoutCoupon = coupon._id;
        } else {
            cart.appliedCoupon = coupon._id;
            cart.discountAmount = discount;
            await cart.save();
        }

        res.status(200).json({
            success: true,
            message: 'Coupon applied successfully.',
            discountAmount: discount
        });
    } catch (error) {
        console.error('Error applying checkout coupon:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const removeCheckoutCoupon = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const checkoutType = req.query.type || 'cart';

        if (checkoutType === 'direct') {
            req.session.directCheckoutCoupon = null;
        } else {
            const Cart = (await import('../../models/Cart.js')).default;
            const cart = await Cart.findOne({ user: userId });
            if (cart) {
                cart.appliedCoupon = null;
                cart.discountAmount = 0;
                await cart.save();
            }
        }

        res.status(200).json({ success: true, message: 'Coupon removed successfully.' });
    } catch (error) {
        console.error('Error removing checkout coupon:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
