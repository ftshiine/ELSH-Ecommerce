import User from "../../models/User.js";
import path from 'path';
import fs from 'fs';


const getUserById = async (id) => {
    return await User.findById(id);
};

const updateUser = async (id,data) => {
    return await User.findByIdAndUpdate(id,data, {new: true});
};

const removeProfileImage = async (id) => {
    const user = await User.findById(id);
    if (user && user.profileImage) {
        const imagePath = path.join(process.cwd(), 'public', user.profileImage);
        try {
            if (fs.existsSync(imagePath)) {
                await fs.promises.unlink(imagePath);
            }
        } catch (err) {
            console.error('Error deleting physical image file:', err);
        }
    }
    return await User.findByIdAndUpdate(id, {profileImage: null}, {new: true});
};

export {getUserById, updateUser, removeProfileImage};