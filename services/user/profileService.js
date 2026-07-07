import User from "../../models/User.js";


const getUserById = async (id) => {
    return await User.findById(id);
};
const updateUser = async (id,data) => {
    return await User.findByIdAndUpdate(id,data, {new: true});
};

export {getUserById , updateUser};