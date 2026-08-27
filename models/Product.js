import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
    size: {
        type: String,
        required: [true, 'Variant size is required'],
        trim: true
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
    offerPrice: {
        type: Number,
        default: null,
        min: [0, 'Offer price cannot be negative']
    },
    appliedOffer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer',
        default: null
    },
    images: {
        type: [String],
        validate: {
            validator: function (v) {
                return v && v.length >= 1;
            },
            message: 'A variant must have at least 1 image'
        },
        required: [true, 'Variant images are required']
    }
});

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
    brand: {
        type: String,
        required: [true, 'Product brand is required'],
        trim: true
    },
    variants: {
        type: [variantSchema],
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: 'A product must have at least 1 variant'
        }
    },
    returnWindowDays: {
        type: Number,
        default: 7,
        min: 0
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    skinType: {
        type: [String],
        default: []
    },
    isListed: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    averageRating: {
        type: Number,
        default: 0
    },
    reviewCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
export default Product;
