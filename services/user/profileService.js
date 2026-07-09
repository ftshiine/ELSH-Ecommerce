import User from "../../models/User.js";
import path from 'path';
import fs from 'fs';


const getUserById = async (id) => {
    return await User.findById(id);
};

const updateUser = async (id,data) => {
    return await User.findByIdAndUpdate(id,data, {new: true});
};

const removeProfileImage = async (id,data) => {
    return await User.findByIdAndUpdate(id, {profileImage:null},{new:true});
}

export {getUserById , updateUser};