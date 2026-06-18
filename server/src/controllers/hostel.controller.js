const Hostel = require("../models/Hostel");
const AppError = require("../utils/AppError");

// CREATE Hostel
// prevents duplicate hostel names for the same owner
// the unique index on { owner, name } handles it at DB level
// but we do a pre-check for a cleaner message

const createHostel = async (req, res, next) => {
	try {
		const { name, address, totalRooms, phone, email } = req.body;
		const ownerId = req.user._id;

		// Pre-check: duplicate name for this owner
		const existing = await Hostel.findOne({
			owner: ownerId,
			name: name
		});

		if (existing) {
			throw new AppError(
				`You already have a hostel named "${name}"`,
				409
			);
		}

		const hostel = await Hostel.create({
			name,
			address,
			totalRooms,
			phone,
			email,
			owner: ownerId
		});

		res.status(201).json({
			success: true,
			hostel
		});
	} catch (error) {
		next(error);
	}
};

// GET My Hostels
// returns all hostels owned by the logged-in user
// the frontend uses this to let the user pick a hostel
// before merging rooms
const getMyHostels = async (req, res, next) => {
	try {
		const hostels = await Hostel.find({
			owner: req.user._id
		});

		res.json({
			success: true,
			count: hostels.length,
			hostels
		});
	} catch (error) {
		next(error);
	}
};

// GET Hostel by ID
// verifies the requesting user owns this hostel

const getHostelById = async (req, res, next) => {
	try {
		const hostel = await Hostel.findOne({
			_id: req.params.id,
			owner: req.user._id // ownership check
		});

		if (!hostel) {
			throw new AppError("Hostel not found", 404);
		}

		res.json({
			success: true,
			hostel
		});
	} catch (error) {
		next(error);
	}
};

module.exports = {
	createHostel,
	getMyHostels,
	getHostelById
};
