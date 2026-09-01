import * as checkoutService from '../../services/user/checkoutService.js';
import { STATUS_CODES, COMMON_MESSAGES, COUPON_MESSAGES, ORDER_MESSAGES } from '../../constants/index.js';

export const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const checkoutType = req.query.type === 'direct' ? 'direct' : 'cart';
    const directItem = req.session.directCheckoutItem;
    const directCouponId = req.session.directCheckoutCoupon;
    const addressId = req.query.addressId;

    const data = await checkoutService.prepareCheckoutData({
      userId,
      checkoutType,
      directItem,
      directCouponId,
      addressId
    });

    if (data.redirectCart) {
      return res.redirect('/cart');
    }

    const breadcrumbs = [
      { name: 'Home', url: '/home' },
      { name: 'Shop', url: '/shop' },
      { name: 'Checkout', url: '/checkout' }
    ];

    res.render('user/checkout/index', {
      title: 'Checkout',
      cart: data.cart,
      selectedAddress: data.selectedAddress,
      breadcrumbs,
      checkoutType,
      walletBalance: data.walletBalance
    });
  } catch (error) {
    console.error('Error loading checkout:', error);
    res.redirect('/cart');
  }
};

export const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { addressId, paymentMethod, checkoutType, useWallet } = req.body;
    const directItem = req.session.directCheckoutItem;
    const directCouponId = req.session.directCheckoutCoupon;

    const result = await checkoutService.processOrderPlacement({
      userId,
      addressId,
      paymentMethod,
      checkoutType,
      useWallet,
      directItem,
      directCouponId
    });

    if (checkoutType === 'direct') {
      req.session.directCheckoutItem = null;
      req.session.directCheckoutCoupon = null;
    }

    res.status(STATUS_CODES.OK).json(result);
  } catch (error) {
    console.error('Error placing order:', error);
    const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    res.status(status).json({ success: false, message: error.message || ORDER_MESSAGES.PAYMENT_PLACE_FAILED });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;

    const result = await checkoutService.verifyPaymentSignatureAndFulfill({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderId
    });

    res.status(STATUS_CODES.OK).json(result);
  } catch (error) {
    console.error('Payment verification error:', error);
    const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      success: false,
      message: error.message || ORDER_MESSAGES.PAYMENT_VERIFY_FAILED,
      oversold: error.oversold || false
    });
  }
};

export const loadSuccess = async (req, res) => {
  try {
    const order = await checkoutService.getOrderByIdForUser(req.params.id, req.session.user.id);

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
    const order = await checkoutService.getOrderByIdForUser(req.params.id, req.session.user.id);

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

    const directItem = await checkoutService.startDirectCheckout({
      userId,
      productId,
      variantSize,
      quantity
    });

    req.session.directCheckoutItem = directItem;
    req.session.directCheckoutCoupon = null;

    res.status(STATUS_CODES.OK).json({ success: true });
  } catch (error) {
    console.error('Error in startDirectCheckout:', error);
    const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    res.status(status).json({ success: false, message: error.message || 'Failed to start direct checkout' });
  }
};

export const applyCheckoutCoupon = async (req, res) => {
  try {
    const { code, checkoutType } = req.body;
    const userId = req.session.user.id || req.session.user._id;
    const directItem = req.session.directCheckoutItem;

    const result = await checkoutService.applyCheckoutCoupon({
      userId,
      code,
      checkoutType,
      directItem
    });

    if (checkoutType === 'direct') {
      req.session.directCheckoutCoupon = result.couponId;
    }

    res.status(STATUS_CODES.OK).json({
      success: true,
      message: COUPON_MESSAGES.APPLIED_SUCCESS,
      discountAmount: result.discountAmount
    });
  } catch (error) {
    console.error('Error applying checkout coupon:', error);
    const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    res.status(status).json({ success: false, message: error.message || COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

export const removeCheckoutCoupon = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const checkoutType = req.query.type || 'cart';

    if (checkoutType === 'direct') {
      req.session.directCheckoutCoupon = null;
    }

    await checkoutService.removeCheckoutCoupon({ userId, checkoutType });

    res.status(STATUS_CODES.OK).json({ success: true, message: COUPON_MESSAGES.REMOVED_SUCCESS });
  } catch (error) {
    console.error('Error removing checkout coupon:', error);
    const status = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    res.status(status).json({ success: false, message: error.message || COMMON_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};
