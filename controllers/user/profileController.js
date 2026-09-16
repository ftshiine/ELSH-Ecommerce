import { getUserById, updateUser, removeProfileImage } from "../../services/user/profileService.js";
import { sendOTP, verifyOTP } from "../../services/user/otpService.js";
import User from "../../models/User.js";
import Coupon from "../../models/Coupon.js";
import Order from "../../models/Order.js";
import { validate } from "../../utils/validation.js";

const loadProfile = async (req, res) => {
    try {

        const user = await getUserById(req.session.user.id);
        if (!user) {
            return res.redirect('login');
        }

        if (!user.referralCode) {
            user.referralCode = user.fullName.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 7).toUpperCase();
            await user.save();
        }
        const breadcrumbs = [
            { name: 'Home', url: '/home' },
            { name: 'My Profile', url: '/profile' }
        ];
        res.render('user/profile/index', { user, breadcrumbs });
    } catch (error) {
        console.error('Load profile error', error);
        res.redirect('/home');
    }
}

const loadEditProfile = async (req, res) => {
    try {
        const user = await getUserById(req.session.user.id);
        if (!user) {
            res.redirect('/login');
        }
        const breadcrumbs = [
            { name: 'Home', url: '/home' },
            { name: 'My Profile', url: '/profile' },
            { name: 'Edit Profile', url: '/profile/edit' }
        ];
        res.render('user/profile/edit', { user, breadcrumbs });
    } catch (error) {
        console.error('Load edit profile error', error);
        res.redirect('/profile');
    }
};

const editProfile = async (req, res) => {
    try {

        const user = await getUserById(req.session.user.id);
        const { fullName, phone, dateOfBirth, gender, email } = req.body;

        
        const validationFields = ['fullName'];
        if (phone) validationFields.push('phone');

        const validation = validate(req.body, validationFields);


        if (!validation.isValid) {
            return res.redirectWithState('/profile/edit', { error: 'Please correct the highlighted fields.', fieldErrors: validation.errors });
        }

        const updateData = {
            fullName: fullName.trim(),
            phone: phone?.trim(),
            dateOfBirth: dateOfBirth || null,
            gender: gender || null,
        };



        if (req.file) {
            updateData.profileImage = req.file.path;
        }

        const updatedUser = await updateUser(req.session.user.id, updateData);
        req.session.user.fullName = updatedUser.fullName;

        req.session.success = 'Profile updated successfully!';
        res.redirect('/profile');

    } catch (error) {
        console.error('Edit profile error:', error);
        res.redirect('/profile');
    }
};

const removePhoto = async (req, res) => {
    try {
        const user = await getUserById(req.session.user.id);
        if (!user || !user.profileImage) {
            req.session.error = 'No custom profile photo to remove.';
            return res.redirect('/profile/edit');
        }

        await removeProfileImage(req.session.user.id);
        req.session.success = 'Profile photo removed successfully.';
        res.redirect('/profile/edit');
    } catch (error) {
        console.error('Remove photo error:', error);
        req.session.error = 'Failed to remove profile photo.';
        res.redirect('/profile/edit');
    }
}


const initiateEmailChange = async (req, res) => {
    try {
        const user = await getUserById(req.session.user.id);
        if (user.googleId) {
            req.session.error = 'Google OAuth users cannot change their email.';
            return res.redirect('/profile/edit');
        }
        
        await sendOTP(user.email);
        req.session.emailChangeState = {
            status: 'pending_current_verify',
            currentOtpSentAt: Date.now()
        };
        res.redirect('/profile/email/verify-current');
    } catch (error) {
        console.error('Initiate email change error:', error);
        req.session.error = 'Failed to send verification code. Please try again.';
        res.redirect('/profile/edit');
    }
};

const loadVerifyCurrentEmail = async (req, res) => {
    const user = await getUserById(req.session.user.id);
    res.render('user/profile/email-change/verify-current', { currentEmail: user.email });
};

const verifyCurrentEmail = async (req, res) => {
    try {
        const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
        const otp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
        const user = await getUserById(req.session.user.id);
        
        const result = verifyOTP(user.email, otp);
        if (!result.success) {
            return res.redirectWithState('/profile/email/verify-current', { error: result.message });
        }
        
        req.session.emailChangeState.status = 'current_verified';
        res.redirect('/profile/email/new');
    } catch (error) {
        console.error('Verify current email error:', error);
        res.redirectWithState('/profile/email/verify-current', { error: 'Verification failed. Please try again.' });
    }
};

const loadNewEmail = (req, res) => {
    res.render('user/profile/email-change/new-email');
};

const submitNewEmail = async (req, res) => {
    try {
        const { newEmail } = req.body;
        const validation = validate({ email: newEmail }, ['email']);

        if (!validation.isValid) {
            return res.redirectWithState('/profile/email/new', { error: 'Invalid email format.', fieldErrors: validation.errors });
        }

        const emailLower = newEmail.toLowerCase().trim();
        const currentUser = await getUserById(req.session.user.id);

        if (emailLower === currentUser.email) {
            return res.redirectWithState('/profile/email/new', { fieldErrors: { newEmail: 'This is already your email.' } });
        }

        const existingUser = await User.findOne({ email: emailLower });
        if (existingUser) {
            return res.redirectWithState('/profile/email/new', { fieldErrors: { newEmail: 'Email is already registered to another account.' } });
        }

        await sendOTP(emailLower);
        
        req.session.emailChangeState.status = 'pending_new_verify';
        req.session.emailChangeState.newEmail = emailLower;
        req.session.emailChangeState.newOtpSentAt = Date.now();
        
        res.redirect('/profile/email/verify-new');
    } catch (error) {
        console.error('Submit new email error:', error);
        res.redirectWithState('/profile/email/new', { error: 'Failed to process request. Please try again.' });
    }
};

const loadVerifyNewEmail = (req, res) => {
    res.render('user/profile/email-change/verify-new', { newEmail: req.session.emailChangeState.newEmail });
};

const verifyNewEmail = async (req, res) => {
    try {
        const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
        const otp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
        const newEmail = req.session.emailChangeState.newEmail;
        
        const result = verifyOTP(newEmail, otp);
        if (!result.success) {
            return res.redirectWithState('/profile/email/verify-new', { error: result.message });
        }
        
        await updateUser(req.session.user.id, { email: newEmail });
        req.session.user.email = newEmail;
        
        delete req.session.emailChangeState;
        req.session.success = 'Email address updated successfully!';
        res.redirect('/profile');
    } catch (error) {
        console.error('Verify new email error:', error);
        res.redirectWithState('/profile/email/verify-new', { error: 'Verification failed. Please try again.' });
    }
};

const cancelEmailChange = (req, res) => {
    delete req.session.emailChangeState;
    res.redirect('/profile/edit');
};

const loadUserCoupons = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await getUserById(userId);
        
        if (!user) {
            return res.redirect('/login');
        }

        const now = new Date();

        // 1. Fetch available coupons
        const activeCoupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: now },
            $and: [
                { $or: [{ endDate: null }, { endDate: { $gt: now } }] },
                { $or: [{ targetUserId: null }, { targetUserId: userId }] }
            ]
        }).sort({ createdAt: -1 });

        // 2. Fetch expired/inactive coupons
        const expiredCoupons = await Coupon.find({
            $and: [
                { $or: [{ isActive: false }, { endDate: { $lte: now } }] },
                { $or: [{ targetUserId: null }, { targetUserId: userId }] }
            ]
        }).sort({ endDate: -1 });

        // 3. Calculate total savings
        const orders = await Order.find({ user: userId, 'pricing.discount': { $gt: 0 } });
        const totalSavings = orders.reduce((sum, order) => sum + order.pricing.discount, 0);

        const breadcrumbs = [
            { name: 'Home', url: '/home' },
            { name: 'My Profile', url: '/profile' },
            { name: 'My Coupons', url: '/profile/coupons' }
        ];

        const returnTo = req.query.returnTo || null;
        const checkoutType = req.query.checkoutType || 'cart';

        res.render('user/profile/coupons', {
            user,
            breadcrumbs,
            activeCoupons,
            expiredCoupons,
            totalSavings,
            returnTo,
            checkoutType
        });

    } catch (error) {
        console.error('Error loading user coupons:', error);
        res.redirect('/profile');
    }
}

export { 
    loadProfile, 
    loadEditProfile, 
    editProfile, 
    removePhoto, 
    initiateEmailChange,
    loadVerifyCurrentEmail,
    verifyCurrentEmail,
    loadNewEmail,
    submitNewEmail,
    loadVerifyNewEmail,
    verifyNewEmail,
    cancelEmailChange,
    loadUserCoupons
};