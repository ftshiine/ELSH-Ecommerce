import { getUserById, updateUser, removeProfileImage } from "../../services/user/profileService.js";
import { sendOTP, verifyOTP } from "../../services/user/otpService.js";
import User from "../../models/User.js";
import { validate } from "../../utils/validation.js";

const loadProfile = async (req, res) => {
    try {

        const user = await getUserById(req.session.user.id);
        if (!user) {
            return res.redirect('login');
        }
        res.render('user/profile/index', { user });
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
        res.render('user/profile/edit', { user });
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
            updateData.profileImage = `/images/user/profiles/${req.file.filename}`;
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

const requireEmailState = (requiredStatus) => {
    return (req, res, next) => {
        if (!req.session.emailChangeState || req.session.emailChangeState.status !== requiredStatus) {
            delete req.session.emailChangeState;
            req.session.error = 'Invalid email change flow. Please start over.';
            return res.redirect('/profile/edit');
        }
        next();
    };
};

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

export { 
    loadProfile, 
    loadEditProfile, 
    editProfile, 
    removePhoto, 
    requireEmailState,
    initiateEmailChange,
    loadVerifyCurrentEmail,
    verifyCurrentEmail,
    loadNewEmail,
    submitNewEmail,
    loadVerifyNewEmail,
    verifyNewEmail,
    cancelEmailChange 
};