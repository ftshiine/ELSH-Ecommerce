import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const userSchema = new mongoose.Schema({
    email: String,
    role: String
}, { strict: false });

const User = mongoose.model('User', userSchema);

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;
        
        // List collections
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        // Count users
        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        
        console.log("Database URI:", process.env.MONGO_URI);
        console.log("Collections found:", collectionNames);
        console.log("Total Users:", totalUsers);
        console.log("Total Admins:", totalAdmins);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
