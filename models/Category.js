import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Category description is required'],
        trim: true
    },
    image: {
        type: String,
        required: [true, 'Category image is required']
    },
    isListed: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Ensure case-insensitive uniqueness for category name
categorySchema.index(
    { name: 1 },
    { unique: true, collation: { locale: 'en', strength: 2 } }
);

const Category = mongoose.model('Category', categorySchema);
export default Category;
