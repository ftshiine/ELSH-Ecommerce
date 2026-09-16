import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  referralRewardType: {
    type: String,
    enum: ['WALLET', 'COUPON'],
    default: 'WALLET'
  },
  referralRewardReferrer: {
    type: Number,
    required: true,
    default: 100
  },
  referralRewardReferee: {
    type: Number,
    required: true,
    default: 50
  },
  referralCouponReferrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    default: null
  },
  referralCouponReferee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    default: null
  }
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
