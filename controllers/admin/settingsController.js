import Settings from '../../models/Settings.js';
import Coupon from '../../models/Coupon.js';

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne()
        .populate('referralCouponReferrer')
        .populate('referralCouponReferee');
        
    if (!settings) {
      settings = await Settings.create({});
    }

    const activeCoupons = await Coupon.find({ isActive: true, targetUserId: null }).sort({ createdAt: -1 });

    res.render('admin/settings/index', {
      title: 'Settings',
      activePage: 'settings',
      settings,
      activeCoupons
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).send('Internal Server Error');
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { 
        referralRewardType, 
        referralRewardReferrer, 
        referralRewardReferee,
        referralCouponReferrer,
        referralCouponReferee
    } = req.body;
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    
    if (['WALLET', 'COUPON'].includes(referralRewardType)) {
      settings.referralRewardType = referralRewardType;
    }
    
    settings.referralRewardReferrer = Number(referralRewardReferrer) || 100;
    settings.referralRewardReferee = Number(referralRewardReferee) || 50;
    
    if (referralCouponReferrer) settings.referralCouponReferrer = referralCouponReferrer;
    if (referralCouponReferee) settings.referralCouponReferee = referralCouponReferee;
    
    await settings.save();
    
    // We can respond with JSON if submitted via fetch, or redirect if form submit
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true, message: 'Settings updated successfully' });
    }
    
    res.redirect('/admin/settings');
  } catch (error) {
    console.error('Error updating settings:', error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
    res.redirect('/admin/settings');
  }
};

export const setReferralCoupon = async (req, res) => {
  try {
    const { type, couponId } = req.query;
    
    let settings = await Settings.findOne();
    if (!settings) {
        settings = await Settings.create({});
    }

    settings.referralRewardType = 'COUPON';

    if (type === 'referrer') {
        settings.referralCouponReferrer = couponId;
    } else if (type === 'referee') {
        settings.referralCouponReferee = couponId;
    }

    await settings.save();
    
    res.redirect('/admin/settings');
  } catch (error) {
    console.error('Error setting referral coupon:', error);
    res.redirect('/admin/settings');
  }
};
