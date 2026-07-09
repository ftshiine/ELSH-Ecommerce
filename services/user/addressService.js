import Address from '../../models/Address.js';

export const getAddressesByUser = async (userId) => {
  return await Address.find({ userId }).sort({ isPrimary: -1, createdAt: -1 });
};

export const getAddressById = async (id, userId) => {
  return await Address.findOne({ _id: id, userId });
};

export const createAddress = async (userId, data) => {
  if (data.isPrimary) {
    await Address.updateMany({ userId }, { isPrimary: false });
  } else {
    // If it's the user's first address, make it primary automatically
    const count = await Address.countDocuments({ userId });
    if (count === 0) {
      data.isPrimary = true;
    }
  }

  const address = new Address({ ...data, userId });
  return await address.save();
};

export const updateAddress = async (id, userId, data) => {
  if (data.isPrimary) {
    await Address.updateMany({ userId, _id: { $ne: id } }, { isPrimary: false });
  } else {
    // Prevent unsetting primary if it's the only one, or if there is no other primary
    // If they explicitly uncheck it, let's see if we should enforce one primary
    // The requirement says "Set as Primary", so if unchecked, and it was primary, let's just let it be. 
    // Or we can just let them save.
  }
  return await Address.findOneAndUpdate({ _id: id, userId }, data, { new: true });
};

export const deleteAddress = async (id, userId) => {
  const address = await Address.findOne({ _id: id, userId });
  if (!address) return null;
  
  const wasPrimary = address.isPrimary;
  await Address.deleteOne({ _id: id, userId });

  // If deleted was primary, assign primary to the most recently created one
  if (wasPrimary) {
    const nextAddress = await Address.findOne({ userId }).sort({ createdAt: -1 });
    if (nextAddress) {
      nextAddress.isPrimary = true;
      await nextAddress.save();
    }
  }

  return true;
};

export const setPrimaryAddress = async (id, userId) => {
  await Address.updateMany({ userId }, { isPrimary: false });
  return await Address.findOneAndUpdate({ _id: id, userId }, { isPrimary: true }, { new: true });
};
