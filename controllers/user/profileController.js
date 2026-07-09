import { getUserById, updateUser } from "../../services/user/profileService.js";

const loadProfile = async (req,res) => {
    try{
        if(!req.session.user){
            return res.redirect('/login');
        }

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
        if(!req.session.user){
            return res.redirect('/login');
        }
        const user = await getUserById(req.session.user.id);
        if(!user){
            res.redirect('/login');
        }
    res.render('user/profile/edit',{user, error:null, success:null});
    }catch(error){
        console.error('Load edit profile error',error);
        res.redirect('/profile');
    }
};

const editProfile = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect('/login');

    const user = await getUserById(req.session.user.id);
    const { fullName, phone, dateOfBirth, gender } = req.body;

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

    if (req.file) {
      updateData.profileImage = `/images/user/profiles/${req.file.filename}`;
    }

    const updatedUser = await updateUser(req.session.user.id, updateData);
    req.session.user.fullName = updatedUser.fullName;

    const refreshedUser = await getUserById(req.session.user.id);
    res.render('user/profile/edit', { user: refreshedUser, error: null, success: 'Profile updated successfully!' });

  } catch (error) {
    console.error('Edit profile error:', error);
    res.redirect('/profile');
  }
};

const removePhoto = async (req,res) => {
    try{
        if(!req.session.user){
            res.redirect('/login');
        }
        await removeProfileImage(req.session.user.id);
        res.redirect('/profile/edit');
    }catch(error){
        console.error('Remove photo error',error);
        res.redirect('/profile/edit');
    }
} 


export {loadProfile,loadEditProfile,editProfile,removePhoto};