const loadHome = (req,res) => {
    if(!req.session.user){
        return res.redirect('/login')
    }
    res.render('user/home', {user: req.session.user});
}


export { loadHome};
