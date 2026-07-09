const loadHome = (req,res) => {
    res.render('user/home', {user: req.session.user});
}


export { loadHome};
