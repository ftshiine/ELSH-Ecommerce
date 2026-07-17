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

        if (req.uploadError) {
            return res.render('user/profile/edit', { user, error: req.uploadError, fieldErrors: validation.errors || {}, success: null });
        }

        if (!validation.isValid) {
            return res.render('user/profile/edit', { user, error: 'Please correct the highlighted fields.', fieldErrors: validation.errors, success: null });
        }

        const updateData = {
            fullName: fullName.trim(),
            phone: phone?.trim(),
            dateOfBirth: dateOfBirth || null,
            gender: gender || null,
        };

        if (!user.googleId && email && email.trim() !== user.email) {
            if (req.session.verifiedNewEmail === email.trim()) {
                updateData.email = email.toLowerCase().trim();
                delete req.session.verifiedNewEmail;
            } else {
                return res.render('user/profile/edit', { user, error: 'Please correct the highlighted fields.', fieldErrors: { email: 'Email verification required.' } });
            }
        }

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

const editEmailRequest = async (req, res) => {
    try {
        const { newEmail } = req.body;
        const validation = validate({ email: newEmail }, ['email']);

        if (!validation.isValid) {
            return res.json({ success: false, message: validation.errors.email });
        }

        const emailLower = newEmail.toLowerCase().trim();
        const currentUser = await getUserById(req.session.user.id);

        if (currentUser.googleId) {
            return res.json({ success: false, message: 'Google OAuth users cannot change their email' });
        }

        if (emailLower === currentUser.email) {
            return res.json({ success: false, message: 'This is already your email' });
        }

        const existingUser = await User.findOne({ email: emailLower });
        if (existingUser) {
            return res.json({ success: false, message: 'Email is already registered to another account' });
        }

        await sendOTP(emailLower);
        res.json({ success: true });
    } catch (error) {
        console.error('Edit email request error:', error);
        res.json({ success: false, message: 'Failed to send OTP' });
    }
};

const verifyEmailOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const emailLower = email.toLowerCase().trim();

        const result = verifyOTP(emailLower, otp);
        if (result.success) {
            req.session.verifiedNewEmail = emailLower;
            res.json({ success: true });
        } else {
            res.json({ success: false, message: result.message });
        }
    } catch (error) {
        console.error('Verify email OTP error:', error);
        res.json({ success: false, message: 'Verification failed' });
    }
};

export { loadProfile, loadEditProfile, editProfile, removePhoto, editEmailRequest, verifyEmailOtp };