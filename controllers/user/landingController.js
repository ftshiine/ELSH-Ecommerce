import * as homeService from '../../services/user/homeService.js';

const loadLanding = async (req, res) => {
  try {
    const landingData = await homeService.getLandingData();
    res.render('user/landing', landingData);
  } catch (error) {
    console.error('Error loading landing page:', error);
    res.render('user/landing');
  }
};

export { loadLanding };