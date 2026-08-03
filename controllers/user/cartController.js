import Cart from '../../models/Cart.js';
import Product from '../../models/Product.js';

/**
 * GET /cart
 * Load the user's cart page
 */
export const loadCart = async (req, res) => {
    try {
        const userId = req.session.user.id || req.session.user._id;

        // Find cart and populate products
        let cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart) {
            cart = { items: [], cartTotal: 0 };
        } else {
            // Filter out unlisted or deleted products and recalculate cart total
            let cartModified = false;
            let newTotal = 0;
            const validItems = [];

            for (const item of cart.items) {
                if (item.product && item.product.isListed) {
                    // Update price in case it changed
                    const effectivePrice = item.product.salePrice && item.product.salePrice < item.product.regularPrice 
                        ? item.product.salePrice 
                        : item.product.regularPrice;
                    
                    item.price = effectivePrice;
                    item.totalPrice = effectivePrice * item.quantity;
                    newTotal += item.totalPrice;
                    validItems.push(item);
                } else {
                    cartModified = true;
                }
            }

            if (cartModified || cart.cartTotal !== newTotal) {
                cart.items = validItems;
                cart.cartTotal = newTotal;
                await cart.save();
            }
        }

        // Fetch related products for "Complete the Set"
        const relatedProducts = await Product.find({ isListed: true }).populate('category').limit(4).sort({ isFeatured: -1, createdAt: -1 });

        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Cart', url: '/cart' }
        ];

        res.render('user/cart/index', {
            title: 'Your Cart',
            cart,
            relatedProducts,
            breadcrumbs
        });
    } catch (error) {
        console.error('Error loading cart page:', error);
        res.status(500).send('Internal Server Error');
    }
};

/**
 * POST /cart/add/:productId
 * Add product to cart
 */
export const addToCart = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user.id || req.session.user._id;
        const quantity = parseInt(req.body.quantity) || 1;

        const product = await Product.findById(productId);

        if (!product || !product.isListed) {
            return res.status(404).json({ success: false, message: 'Product is unavailable.' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Not enough stock available.' });
        }

        const effectivePrice = product.salePrice && product.salePrice < product.regularPrice 
            ? product.salePrice 
            : product.regularPrice;

        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = new Cart({
                user: userId,
                items: [{
                    product: productId,
                    quantity: quantity,
                    price: effectivePrice,
                    totalPrice: effectivePrice * quantity
                }],
                cartTotal: effectivePrice * quantity
            });
        } else {
            const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

            if (itemIndex > -1) {
                // Product exists, update quantity
                const newQuantity = cart.items[itemIndex].quantity + quantity;
                
                if (newQuantity > 5) {
                    return res.status(400).json({ success: false, message: 'Maximum 5 items allowed per product.' });
                }
                
                if (product.stock < newQuantity) {
                    return res.status(400).json({ success: false, message: 'Not enough stock available.' });
                }

                cart.items[itemIndex].quantity = newQuantity;
                cart.items[itemIndex].price = effectivePrice; // Update to latest price
                cart.items[itemIndex].totalPrice = newQuantity * effectivePrice;
            } else {
                // New product in cart
                cart.items.push({
                    product: productId,
                    quantity: quantity,
                    price: effectivePrice,
                    totalPrice: effectivePrice * quantity
                });
            }

            // Recalculate total
            cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        }

        await cart.save();
        
        // Checklist requirement: Remove product from wishlist when added to cart
        // Note: Wishlist model doesn't exist yet, so we will stub this or leave a comment
        // await Wishlist.findOneAndUpdate({ user: userId }, { $pull: { products: productId } });

        res.status(200).json({ success: true, message: 'Product added to cart successfully.' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

/**
 * PUT /cart/update/:productId
 * Update quantity (increment/decrement)
 */
export const updateQuantity = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user.id || req.session.user._id;
        const action = req.body.action; // 'increment' or 'decrement'

        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found.' });
        }

        const itemIndex = cart.items.findIndex(item => item.product._id.toString() === productId);
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

        if (item.product.stock < newQuantity) {
            return res.status(400).json({ success: false, message: 'Not enough stock available.' });
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
            itemTotalPrice: cart.items[itemIndex].totalPrice,
            cartTotal: cart.cartTotal
        });

    } catch (error) {
        console.error('Error updating cart quantity:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

/**
 * DELETE /cart/remove/:productId
 * Remove item from cart
 */
export const removeFromCart = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user.id || req.session.user._id;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found.' });
        }

        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        
        // Recalculate total
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
