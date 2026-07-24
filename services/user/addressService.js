import Address from '../../models/Address.js';

export const getAddressesByUser = async (userId, page = 1, limit = 4) => {
  const skip = (page - 1) * limit;
  const totalAddresses = await Address.countDocuments({ userId });
  const addresses = await Address.find({ userId })
    .sort({ isPrimary: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    addresses,
    totalAddresses,
    totalPages: Math.ceil(totalAddresses / limit) || 1
  };
};

export const getAddressById = async (id, userId) => {
  return await Address.findOne({ _id: id, userId });
};

export const createAddress = async (userId, data) => {
  if (data.isPrimary) {
    await Address.updateMany({ userId }, { isPrimary: false });
  } else {

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

  }
  return await Address.findOneAndUpdate({ _id: id, userId }, data, { new: true });
};

export const deleteAddress = async (id, userId) => {
  const address = await Address.findOne({ _id: id, userId });
  if (!address) return null;

  const wasPrimary = address.isPrimary;
  await Address.deleteOne({ _id: id, userId });


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
