import { getUserById } from "../../services/user/profileService.js";

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
export {loadProfile};