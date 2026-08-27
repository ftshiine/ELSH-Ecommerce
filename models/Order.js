import mongoose from 'mongoose';
import crypto from 'crypto';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  variantName: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  thumbnail: {
    type: String
  },
  itemTotal: {
    type: Number,
    required: true
  },
  itemStatus: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'OUT FOR DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED'],
    default: 'PENDING'
  },
  cancellationReason: {
    type: String
  },
  returnWindowDays: {
    type: Number,
    default: 7
  }
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  paymentInfo: {
    method: {
      type: String,
      required: true,
      enum: ['COD', 'Razorpay', 'Wallet', 'Wallet + Razorpay']
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING'
    },
    transactionId: {
      type: String
    },
    walletAmountUsed: {
      type: Number,
      default: 0
    }
  },
  orderStatus: {
    type: String,
    required: true,
    enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'OUT FOR DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED'],
    default: 'PENDING'
  },
  pricing: {
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, required: true, default: 0 },
    discount: { type: Number, required: true, default: 0 },
    couponCode: { type: String },
    totalAmount: { type: Number, required: true }
  },
  notes: {
    type: String
  },
  deliveredAt: {
    type: Date
  }
}, { timestamps: true });


orderSchema.pre('validate', function () {
  if (!this.orderId) {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    this.orderId = `LM-${randomHex}`;
  }
});

export default mongoose.model('Order', orderSchema);
