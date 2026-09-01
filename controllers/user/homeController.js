import * as homeService from '../../services/user/homeService.js';

const loadHome = async (req, res) => {
    try {
        const homeData = await homeService.getHomeData();
        res.render('user/home', { user: req.session.user, ...homeData });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.render('user/home', { user: req.session.user });
    }
};

export { loadHome };
