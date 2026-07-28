import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Product description is required'],
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Product category is required']
    },
    regularPrice: {
        type: Number,
        required: [true, 'Regular price is required'],
        min: [0, 'Price cannot be negative']
    },
    salePrice: {
        type: Number,
        min: [0, 'Sale price cannot be negative']
    },
    stock: {
        type: Number,
        required: [true, 'Stock quantity is required'],
        min: [0, 'Stock cannot be negative'],
        default: 0
    },
    images: {
        type: [String],
        validate: {
            validator: function (v) {
                return v && v.length >= 3;
            },
            message: 'A product must have at least 3 images'
        },
        required: [true, 'Product images are required']
    },
    isListed: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
export default Product;
