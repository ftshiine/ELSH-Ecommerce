import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';

export const setLocals = async (req, res, next) => {
  // Flash messages
  res.locals.success = req.session.success || res.locals.success || null;
  res.locals.error = req.session.error || res.locals.error || null;
  delete req.session.success;
  delete req.session.error;

  // Global user/admin state for EJS templates
  res.locals.admin = req.session.admin || null;
  res.locals.user = req.session.user || null;
  
  res.locals.cartCount = 0;
  res.locals.wishlistCount = 0;

  if (req.session.user) {
    try {
      const userId = req.session.user.id || req.session.user._id;
      
      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        res.locals.cartCount = cart.items.length;
      }

      const wishlist = await Wishlist.findOne({ user: userId });
      if (wishlist) {
        res.locals.wishlistCount = wishlist.items.length;
      }
    } catch (err) {
      console.error('Error fetching cart/wishlist counts:', err);
    }
  }
  
  next();
};
