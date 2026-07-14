import session from 'express-session';
import MongoStore from 'connect-mongo';

const sessionConfig = session({
    secret: process.env.SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
    }),

    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    },
});


export default sessionConfig;