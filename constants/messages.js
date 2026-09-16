/**
 * Common Response and Error Message Constants
 * Grouped logically and frozen to guarantee immutability.
 */

export const COMMON_MESSAGES = Object.freeze({
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
  SOMETHING_WENT_WRONG: 'Something went wrong',
  PAGE_NOT_FOUND: 'Page Not Found',
  UNAUTHORIZED_ACCESS: 'Unauthorized access',
  INVALID_REQUEST: 'Invalid request',
  TOO_MANY_REQUESTS: 'Too many requests. Please try again.',
  SERVER_ERROR: 'Server error.',
  ACTION_FAILED: 'Action failed. Please try again.'
});

export const AUTH_MESSAGES = Object.freeze({
  EMAIL_REQUIRED: 'Email is required',
  INVALID_CREDENTIALS: 'Invalid credentials.',
  LOGIN_SUCCESS: 'Logged in successfully.',
  LOGOUT_SUCCESS: 'Logged out successfully.',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully. Please sign in.',
  OTP_SENT: 'OTP has been sent to your email.',
  OTP_INVALID: 'Invalid OTP',
  OTP_EXPIRED: 'OTP has expired',
  ACCOUNT_BLOCKED: 'Your account has been blocked by admin.'
});

export const CATEGORY_MESSAGES = Object.freeze({
  NOT_FOUND: 'Category not found',
  ALREADY_EXISTS: 'Category already exists',
  NAME_IN_USE: 'Category name already in use',
  ADDED_SUCCESS: 'Category added successfully',
  UPDATED_SUCCESS: 'Category updated successfully',
  LISTED_SUCCESS: 'Category listed successfully',
  UNLISTED_SUCCESS: 'Category unlisted successfully',
  NAME_VALIDATION: 'Category name must be between 3 and 50 characters',
  NAME_FORMAT: 'Category name can only contain letters, numbers, spaces, and hyphens',
  DESC_VALIDATION: 'Description must be between 10 and 500 characters',
  IMAGE_REQUIRED: 'Image is required'
});

export const PRODUCT_MESSAGES = Object.freeze({
  NOT_FOUND: 'Product not found',
  ADDED_SUCCESS: 'Product added successfully',
  UPDATED_SUCCESS: 'Product updated successfully',
  LISTED_SUCCESS: 'Product listed successfully',
  UNLISTED_SUCCESS: 'Product unlisted successfully',
  INVALID_VARIANTS: 'Invalid variants format',
  VARIANT_REQUIRED: 'At least one variant is required',
  PRIMARY_IMAGE_REQUIRED: 'Primary product image is required'
});

export const CART_MESSAGES = Object.freeze({
  ITEM_ADDED: 'Product added to cart successfully.',
  ITEM_UPDATED: 'Cart updated successfully.',
  ITEM_REMOVED: 'Item removed from cart successfully.',
  ITEM_NOT_FOUND: 'Item not found in cart.',
  OUT_OF_STOCK: 'This item is currently out of stock.',
  EXCEEDS_STOCK: 'Requested quantity exceeds available stock.',
  MAX_QTY_PER_PERSON: 'Maximum quantity allowed per person reached.',
  CART_EMPTY: 'Your cart is empty.'
});

export const ORDER_MESSAGES = Object.freeze({
  NOT_FOUND: 'Order Not Found',
  PLACED_SUCCESS: 'Order placed successfully.',
  CANCEL_SUCCESS: 'Order cancelled successfully.',
  ITEM_CANCEL_SUCCESS: 'Item cancelled successfully.',
  RETURN_SUCCESS: 'Return request submitted successfully.',
  STATUS_UPDATED: 'Order status updated successfully.',
  STATUS_UPDATE_FAILED: 'Failed to update order status',
  REFUND_SUCCESS: 'Refund processed successfully.',
  REFUND_FAILED: 'Failed to process refund.',
  PAYMENT_RETRY_FAILED: 'Failed to initiate payment retry.',
  PAYMENT_PLACE_FAILED: 'An error occurred while placing your order.',
  PAYMENT_VERIFY_FAILED: 'Server error during payment verification.',
  INVOICE_ERROR: 'Error generating invoice',
  CANNOT_CANCEL: 'Order cannot be cancelled at this stage.',
  CANNOT_RETURN: 'Order cannot be returned at this stage.',
  RETURN_REJECTED: 'Return request rejected. Order reverted to Delivered.',
  RETURN_REJECT_FAILED: 'Failed to reject return request.',
  ALREADY_REFUNDED: 'This order has already been refunded.',
  NOT_RETURN_REQUESTED: 'This order does not have a pending return request.'
});

export const COUPON_MESSAGES = Object.freeze({
  NOT_FOUND: 'Coupon not found.',
  CREATED_SUCCESS: 'Coupon created successfully.',
  CREATE_FAILED: 'Failed to create coupon.',
  APPLIED_SUCCESS: 'Coupon applied successfully.',
  REMOVED_SUCCESS: 'Coupon removed successfully.',
  INVALID_OR_EXPIRED: 'Invalid or expired coupon code.',
  MIN_PURCHASE_NOT_MET: 'Minimum purchase amount not met for this coupon.',
  ALREADY_USED: 'You have already used this coupon.'
});

export const OFFER_MESSAGES = Object.freeze({
  NOT_FOUND: 'Offer not found',
  CREATED_SUCCESS: 'Offer created successfully',
  UPDATED_SUCCESS: 'Offer updated successfully',
  ACTIVATED_SUCCESS: 'Offer activated successfully',
  DEACTIVATED_SUCCESS: 'Offer deactivated successfully',
  ALREADY_EXISTS: 'An active offer already exists for this selection'
});

export const WISHLIST_MESSAGES = Object.freeze({
  LOAD_FAILED: 'Failed to load wishlist',
  UPDATED_SUCCESS: 'Wishlist updated successfully',
  UPDATE_FAILED: 'An error occurred while updating wishlist',
  REMOVED_SUCCESS: 'Product removed from wishlist',
  REMOVE_FAILED: 'Failed to remove from wishlist',
  ITEM_EXISTS: 'Product already in wishlist'
});

export const WALLET_MESSAGES = Object.freeze({
  INSUFFICIENT_BALANCE: 'Insufficient wallet balance',
  ADD_MONEY_FAILED: 'Failed to add money to wallet',
  PAYMENT_FAILED: 'Wallet payment failed'
});

export const ADDRESS_MESSAGES = Object.freeze({
  NOT_FOUND: 'Address not found',
  ADDED_SUCCESS: 'Address added successfully',
  UPDATED_SUCCESS: 'Address updated successfully',
  DELETED_SUCCESS: 'Address deleted successfully',
  MAX_LIMIT_REACHED: 'Maximum address limit reached'
});

export const INVENTORY_MESSAGES = Object.freeze({
  NOT_FOUND: 'Inventory item not found',
  UPDATED_SUCCESS: 'Stock updated successfully',
  UPDATE_FAILED: 'Failed to update stock'
});

export const MESSAGES = Object.freeze({
  COMMON: COMMON_MESSAGES,
  AUTH: AUTH_MESSAGES,
  CATEGORY: CATEGORY_MESSAGES,
  PRODUCT: PRODUCT_MESSAGES,
  CART: CART_MESSAGES,
  ORDER: ORDER_MESSAGES,
  COUPON: COUPON_MESSAGES,
  OFFER: OFFER_MESSAGES,
  WISHLIST: WISHLIST_MESSAGES,
  WALLET: WALLET_MESSAGES,
  ADDRESS: ADDRESS_MESSAGES,
  INVENTORY: INVENTORY_MESSAGES
});

export default MESSAGES;
