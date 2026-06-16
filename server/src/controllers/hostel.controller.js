const Hostel = require("../models/Hostel");
const User = require("../models/User");

const createHostel = async (req, res, next) => {
	try {
		const {
			name,
			address,
			totalRooms,
			phone,
			email
		} = req.body;

		const ownerId = req.user._id;

		const hostel = await Hostel.create({
			name,
			address,
			totalRooms,
			phone,
			email,
			owner: ownerId
		});

		await User.findByIdAndUpdate(
			ownerId,
			{
				hostel: hostel._id
			}
		);

		res.status(201).json({
			success: true,
			hostel
		});
	} catch (error) {
		next(error);
	}
};

module.exports = { createHostel };
