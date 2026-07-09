import { getUserById, updateUser, removeProfileImage } from "../../services/user/profileService.js";
import { sendOTP, verifyOTP } from "../../services/user/otpService.js";
import User from "../../models/User.js";

const loadProfile = async (req,res) => {
    try{

        const user = await getUserById(req.session.user.id);
        if(!user){
            return res.redirect('login');
        }
        res.render('user/profile/index',{user});
    }catch(error){
        console.error('Load profile error',error);
        res.redirect('/home');
    }
}

const loadEditProfile = async (req,res) => {
    try{
        const user = await getUserById(req.session.user.id);
        if(!user){
            res.redirect('/login');
        }
    res.render('user/profile/edit',{user});
    }catch(error){
        console.error('Load edit profile error',error);
        res.redirect('/profile');
    }
};

const editProfile = async (req, res) => {
  try {

    const user = await getUserById(req.session.user.id);
    const { fullName, phone, dateOfBirth, gender, email } = req.body;

    // Validation
    if (!fullName || fullName.trim().length < 2) {
      return res.render('user/profile/edit', { user, error: 'Full name must be at least 2 characters', success: null });
    }

    if (phone && !/^\+?[0-9]{10,15}$/.test(phone.trim().replace(/\s/g, ''))) {
      return res.render('user/profile/edit', { user, error: 'Please enter a valid phone number', success: null });
    }

    const updateData = {
      fullName: fullName.trim(),
      phone: phone?.trim(),
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
    };

    if (email && email.trim() !== user.email) {
      if (req.session.verifiedNewEmail === email.trim()) {
        updateData.email = email.toLowerCase().trim();
        delete req.session.verifiedNewEmail;
      } else {
        return res.render('user/profile/edit', { user, error: 'Email verification required.' });
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
        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            return res.json({ success: false, message: 'Invalid email address format' });
        }
        
        const emailLower = newEmail.toLowerCase().trim();
        const currentUser = await getUserById(req.session.user.id);
        
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

export {loadProfile,loadEditProfile,editProfile,removePhoto,editEmailRequest,verifyEmailOtp};