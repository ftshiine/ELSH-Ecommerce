import { findUserByEmail, createUser, validateAccountStatus } from '../../services/user/authService.js';
import { sendOTP, verifyOTP } from '../../services/user/otpService.js';
import { validate } from '../../utils/validation.js';
import bcrypt from 'bcrypt';

const loadSignup = (req, res) => {
  res.render('user/auth/signup', { error: null });
};


const signup = async (req, res) => {
  try {
    if (req.body.fullName) req.body.fullName = req.body.fullName.trim();
    if (req.body.email) req.body.email = req.body.email.trim().toLowerCase();

    const { fullName, email, phone, password, confirmPassword } = req.body;

    const validation = validate(req.body, ['fullName', 'email', 'phone', 'password', 'confirmPassword', 'terms']);
    if (!validation.isValid) {
      return res.redirectWithState('/signup', { error: 'Please correct the highlighted fields.', fieldErrors: validation.errors });
    }

    
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return res.redirectWithState('/signup', { error: 'Please correct the highlighted fields.', fieldErrors: { email: 'Email already registered' } });
    }

    await createUser({ fullName, email, phone, password });
    await sendOTP(email);

    req.session.pendingEmail = email;
    req.session.otpSentAt = Date.now();
    res.redirect('/otp');

  } catch (error) {
    console.error('Signup error:', error);
    res.redirectWithState('/signup', { error: 'Something went wrong' });
  }
};

const loadOTP = (req, res) => {
  if (!req.session.pendingEmail) {
    return res.redirect('/signup');
  }
  const now = Date.now();
  const otpSendAt = req.session.otpSendAt || now;
  const elapsed = Math.floor((now - otpSendAt) / 1000);
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
      return res.redirectWithState('/otp', { error: result.message });
    }

    
    await findUserByEmail(email).then(user => {
      user.isActive = true;
      return user.save();
    });

    req.session.pendingEmail = null;
    req.session.otpSentAt = null;
    res.redirect('/login');

  } catch (error) {
    console.error('OTP verify error:', error);
    res.redirectWithState('/otp', { error: 'Something went wrong' });
  }
};

const resendOTP = async (req, res) => {
  try {
    const email = req.session.pendingEmail;
    if (!email) return res.status(400).json({ success: false });

    await sendOTP(email);
    req.session.otpSentAt = Date.now();
    res.status(200).json({ success: true });

  } catch (error) {

    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false });
  }
}

const loadLogin = (req, res) => {
  res.render('user/auth/login');
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const validationRes = validate(req.body, ['email']);
    
    if (!password || password.trim().length === 0) {
      if (!validationRes.errors) validationRes.errors = {};
      validationRes.errors.password = 'Password is required';
      validationRes.isValid = false;
    }

    if (!validationRes.isValid) {
      return res.redirectWithState('/login', { error: 'Please correct the highlighted fields.', fieldErrors: validationRes.errors })
    }

    if (!email || !password) {
      return res.redirectWithState('/login', { error: 'All fields are required' });
    }

    const user = await findUserByEmail(email);

    
    if (!user) {
      return res.redirectWithState('/login', { error: 'Invalid email or password' });
    }

    const validation = validateAccountStatus(user);
    if (!validation.isValid) {
      return res.redirectWithState('/login', { error: validation.message });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.redirectWithState('/login', { error: 'Invalid email or password' });
    }

    req.session.user = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }

    res.redirect('/home');

  } catch (error) {
    console.error('Login error:', error);
    res.redirectWithState('/login', { error: 'Something went wrong' })
  }
};

const logout = (req, res) => {
  if (req.session) {
    
    delete req.session.user;

    const handleSessionDestruction = () => {
      if (!req.session.admin) {
        
        req.session.destroy((err) => {
          if (err) console.error('Session destroy error during user logout:', err);
          res.clearCookie('connect.sid');
          return res.redirect('/login');
        });
      } else {

        req.session.save(() => {
          return res.redirect('/login');
        });
      }
    };

    
    if (req.logout) {
      req.logout({ keepSessionInfo: true }, (err) => {
        if (err) console.error('Passport logout error:', err);
        handleSessionDestruction();
      });
    } else {
      handleSessionDestruction();
    }
  } else {
    res.redirect('/login');
  }
}

const googleAuthCallback = (req, res) => {
  req.session.user = {
    id: req.user._id,
    fullName: req.user.fullName,
    email: req.user.email,
    role: req.user.role,
  };

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authenticating...</title>
      <script>
        if (window.opener && !window.opener.closed) {
          window.opener.location.href = '/home';
          window.close();
        } else {
          window.location.replace('/home');
        }
      </script>
      <noscript>
        <meta http-equiv="refresh" content="0;url=/home">
      </noscript>
    </head>
    <body></body>
    </html>
  `);
};

export { loadSignup, signup, loadOTP, verifyOTPHandler, resendOTP, loadLogin, login, logout, googleAuthCallback };






