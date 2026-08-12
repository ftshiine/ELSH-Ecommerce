import Cart from '../../models/Cart.js';
import Address from '../../models/Address.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';

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
        return res.redirect('/cart');
      }
    }

    const addresses = await Address.find({ userId }).sort({ isPrimary: -1, createdAt: -1 });

    const breadcrumbs = [
      { name: 'Home', url: '/home' },
      { name: 'Shop', url: '/shop' },
      { name: 'Checkout', url: '/checkout' }
    ];

    res.render('user/checkout/index', {
      title: 'Checkout',
      cart,
      addresses,
      breadcrumbs,
      checkoutType
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
    const { addressId, paymentMethod, checkoutType } = req.body;

    if (!addressId) {
      return res.status(400).json({ success: false, message: 'Please select a delivery address.' });
    }

    if (paymentMethod !== 'COD') {
      return res.status(400).json({ success: false, message: 'Currently, only Cash on Delivery is supported.' });
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
    } else {
      cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: 'Your cart is empty.' });
      }
    }

    // Verify stock and prepare order items
    const orderItems = [];
    let totalAmount = 0;

    for (const item of cart.items) {
      const product = item.product;
      
      if (!product) {
        // Rollback on error
        for (const decItem of successfullyDecremented) {
          await Product.updateOne(
            { _id: decItem.productId, 'variants._id': decItem.variantId },
            { $inc: { 'variants.$.stock': decItem.quantity } }
          );
        }
        return res.status(400).json({ success: false, message: 'One or more items in your cart are no longer available.' });
      }

      const variant = product.variants.find(v => v.size === item.variantSize) || product.variants[0];

      // Atomic stock decrement
      const updateResult = await Product.updateOne(
        { _id: product._id, 'variants._id': variant._id, 'variants.stock': { $gte: item.quantity } },
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
        return res.status(400).json({ success: false, message: `Sorry, ${product.name} (${item.variantSize || 'Default'}) is out of stock or does not have enough stock available.` });
      }

      successfullyDecremented.push({ productId: product._id, variantId: variant._id, quantity: item.quantity });

      orderItems.push({
        product: product._id,
        variant: variant._id,
        productName: product.name,
        variantName: item.variantSize,
        price: item.price,
        quantity: item.quantity,
        thumbnail: variant && variant.images.length > 0 ? variant.images[0].replace(/^public[\\/]/, '/') : '',
        itemTotal: item.totalPrice
      });
      totalAmount += item.totalPrice;
    }

    // Taxes & Shipping logic (using placeholders based on Figma)
    const subtotal = totalAmount;
    const shippingFee = 0; // Complimentary
    const estimatedTax = subtotal * 0.08; // 8% tax as per Figma ($325 -> $26)
    const finalTotal = subtotal + shippingFee + estimatedTax;

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
        method: 'COD',
        status: 'PENDING'
      },
      orderStatus: 'PENDING',
      pricing: {
        subtotal: subtotal,
        shippingFee: shippingFee,
        discount: 0,
        totalAmount: finalTotal
      }
    });

    await newOrder.save();

    if (checkoutType === 'direct') {
      req.session.directCheckoutItem = null;
    } else {
      cart.items = [];
      cart.cartTotal = 0;
      await cart.save();
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

export const startDirectCheckout = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { productId, variantSize, quantity } = req.body;
    
    // Check and remove from persistent cart if it exists
    let cart = await Cart.findOne({ user: userId });
    if (cart) {
      const itemIndex = cart.items.findIndex(
        item => item.product.toString() === productId && item.variantSize === variantSize
      );
      if (itemIndex > -1) {
        cart.items.splice(itemIndex, 1);
        // Recalculate cartTotal
        cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        await cart.save();
      }
    }

    // Save item in session
    req.session.directCheckoutItem = { productId, variantSize, quantity };
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error in startDirectCheckout:', error);
    res.status(500).json({ success: false, message: 'Failed to start direct checkout' });
  }
};
