import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';

const sessionConfig = session({
    secret: process.env.SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    store: MongoStore.create({
        clientPromise: mongoose.connection.asPromise().then(c => c.getClient()),
    }),

    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    },
});


export default sessionConfig;