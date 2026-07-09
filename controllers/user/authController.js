import { findUserByEmail, findUserByUsername, createUser } from '../../services/user/authService.js';
import { sendOTP, verifyOTP } from '../../services/user/otpService.js';
import { validateSignup, validateLogin } from '../../utils/validation.js';
import bcrypt from 'bcrypt';

const loadSignup = (req, res) => {
  res.render('user/auth/signup', { error: null });
};


const signup = async (req, res) => {
  try {
    const { fullName, username, email, phone, password, confirmPassword } = req.body;

    // Validate inputs
    const errors = validateSignup({ fullName, username, email, phone, password, confirmPassword });
    if (errors.length > 0) {
      return res.render('user/auth/signup', { error: errors[0] });
    }

    // Check existing email
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return res.render('user/auth/signup', { error: 'Email already registered' });
    }

    // Check existing username
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      return res.render('user/auth/signup', { error: 'Username already taken' });
    }

    await createUser({ fullName, username, email, phone, password });
    await sendOTP(email);

    req.session.pendingEmail = email;
    req.session.otpSentAt = Date.now();
    res.redirect('/otp');

  } catch (error) {
    console.error('Signup error:', error);
    res.render('user/auth/signup', { error: 'Something went wrong' });
  }
};

const loadOTP = (req, res) => {
  if (!req.session.pendingEmail) {
    return res.redirect('/signup');
  }
  const now = Date.now();
  const otpSendAt = req.session.otpSendAt || now;
  const elapsed = Math.floor((now - otpSendAt)/1000);
  const remaining = Math.max(59 - elapsed, 0);

  res.render('user/auth/otp', { error: null, remaining });
};

const verifyOTPHandler = async (req, res) => {
  try {
    const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
    const otp = `${otp1}${otp2}${otp3}${otp4}${otp5}${otp6}`;
    const email = req.session.pendingEmail;

    if (!email) return res.redirect('/signup');

    const result = verifyOTP(email, otp);

   if (!result.success) {
      const now = Date.now();
      const otpSentAt = req.session.otpSentAt || now;
      const elapsed = Math.floor((now - otpSentAt) / 1000);
      const remaining = Math.max(59 - elapsed, 0);
      return res.render('user/auth/otp', { error: result.message, remaining });
    }

    // Activate user
    await findUserByEmail(email).then(user => {
      user.isActive = true;
      return user.save();
    });

    req.session.pendingEmail = null;
    req.session.otpSentAt = null;
    res.redirect('/login');

  } catch (error) {
    console.error('OTP verify error:', error);
    res.render('user/auth/otp', { error: 'Something went wrong', remaining: 0 });
  }
};

const resendOTP = async (req,res) => {
  try{
    const email = req.session.pendingEmail;
    if(!email) return res.status(400).json({success:false});

    await sendOTP(email);
    req.session.otpSentAt = Date.now();
    res.status(200).json({success:true});

  }catch(error){

    console.error('Resend OTP error:',error);
    res.status(500).json({success:false});
  }
}

const loadLogin = (req,res) => {
  res.render('user/auth/login', {error: null});
}

const login = async (req,res) => {
  try{
    const {email,password} = req.body;

    const errors = validateLogin({email,password});
    if(errors.length > 0){
      return res.render('user/auth/login', {error: errors[0]})
    }

    if(!email || !password){
      return res.render('user/auth/login',{error: 'All fields are required'});
    }

    const user = await findUserByEmail(email);
    if(!user){
      return res.render('user/auth/login',{error: 'Invalid email or password'});
    }

    if(!user.isActive){
      return res.render('user/auth/login',{error: 'Your account has been blocked'})
    }

    const isMatch = await bcrypt.compare(password,user.password);
    if(!isMatch){
      return res.render('user/auth/login',{error: 'Invalid email or password'});
    }

    req.session.user ={
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }

    res.redirect('/home');

  }catch(error){
    console.error('Login error:',error);
    res.render('user/auth/login', {error: 'Something went wrong'})
  }
};

const logout = (req,res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  })
}

export { loadSignup, signup, loadOTP, verifyOTPHandler, resendOTP,loadLogin,login,logout };