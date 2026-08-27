import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  bannerImage: {
    type: String,
    default: null
  },
  targetType: {
    type: String,
    enum: ['product', 'category', 'variant'],
    default: 'product'
  },
  targetProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  targetCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  targetVariants: [{
    type: mongoose.Schema.Types.ObjectId
  }],
  status: {
    type: String,
    enum: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'EXPIRED'],
    default: 'DRAFT'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Middleware to automatically update status based on dates
offerSchema.pre('save', function () {
  const now = new Date();
  
  // Normalize dates to start/end of day for accurate comparison regardless of time
  const current = now.getTime();
  const start = this.startDate ? new Date(this.startDate).setHours(0,0,0,0) : 0;
  // End date should include the entire day
  const end = this.endDate ? new Date(this.endDate).setHours(23,59,59,999) : Infinity;

  if (this.status !== 'DRAFT') {
    if (current > end) {
      this.status = 'EXPIRED';
    } else if (current >= start && current <= end) {
      this.status = 'ACTIVE';
    } else if (current < start) {
      this.status = 'SCHEDULED';
    }
  }
});

export default mongoose.model('Offer', offerSchema);
