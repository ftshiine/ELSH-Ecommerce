import User from "../../models/User.js";
import path from 'path';
import fs from 'fs';
import cloudinary from '../../config/cloudinary.js';

const getUserById = async (id) => {
    return await User.findById(id);
};

const updateUser = async (id, data) => {
    return await User.findByIdAndUpdate(id, data, { new: true });
};

const removeProfileImage = async (id) => {
    const user = await User.findById(id);
    if (user && user.profileImage) {
        if (user.profileImage.includes('cloudinary.com')) {
            try {
                const parts = user.profileImage.split('/upload/');
                if (parts.length > 1) {
                    const pathWithoutUpload = parts[1];
                    const versionEnd = pathWithoutUpload.indexOf('/');
                    const pathWithoutVersion = pathWithoutUpload.substring(versionEnd + 1);
                    const publicId = pathWithoutVersion.substring(0, pathWithoutVersion.lastIndexOf('.'));
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId);
                    }
                }
            } catch (err) {
                console.error('Error deleting image from Cloudinary:', err);
            }
        } else {
            const imagePath = path.join(process.cwd(), 'public', user.profileImage);
            try {
                if (fs.existsSync(imagePath)) {
                    await fs.promises.unlink(imagePath);
                }
            } catch (err) {
                console.error('Error deleting physical image file:', err);
            }
        }
    }
    return await User.findByIdAndUpdate(id, { profileImage: null }, { new: true });
};

export { getUserById, updateUser, removeProfileImage };