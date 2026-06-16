const Room = require("../models/Room");
const Tenant = require("../models/Tenant");
const AppError = require("../utils/AppError");

// Create Room
// Only owner/staff can call this
// hostel is always taken from req.user.hostel (never from req.body)
// status is forced to "available" on creation

const createRoom = async (req, res, next) => {
	try {
		const room = await Room.create({
			...req.body,
			hostel: req.user.hostel, // multi-tenancy: always from token
			status: "available" // always start available
		});

		res.status(201).json({
			success: true,
			room
		});
	} catch (error) {
		next(error);
	}
};

//GET Rooms
//Supports: ?floor=2 &type=double &status=available
//Always scoped to req.user.hostel

const getRooms = async (req, res, next) => {
	try {
		const filter = {
			hostel: req.user.hostel // multi-tenancy guard
		};

		if (req.query.floor)
			filter.floor = req.query.floor;

		if (req.query.type)
			filter.type = req.query.type;

		if (req.query.status)
			filter.status = req.query.status;

		const rooms = await Room.find(filter);

		res.json({
			success: true,
			count: rooms.length,
			rooms
		});
	} catch (error) {
		next(error);
	}
};

//GET Room by ID
//scoped by hostel. Populated active tenants

const getRoomById = async (req, res, next) => {
	try {
		const room = await Room.findOne({
			_id: req.params.id,
			hostel: req.user.hostel
		});

		if (!room) {
			throw new AppError("Room not found", 404);
		}

		const tenants = await Tenant.find({
			room: room_id,
			status: "active"
		}).populate("user", "name email phone");

		res.json({
			success: true,
			room,
			tenants
		});
	} catch (error) {
		next(error);
	}
};

// UPDATE Room
// Allowed fields: amenities, rent, type, status
// Status transitions are guarded by a state machine

const updateRoom = async (req, res, next) => {
	try {
		const room = await Room.findOne({
			_id: req.params.id,
			hostel: req.user.hostel
		});

		if (!room) {
			throw new AppError("Room not found", 404);
		}

		const {amenities, rent, type, status} = req.body;

		// status state machine
		
		if (status) {
			// cannot move occupied -> maintenance directly
			if (room.status === "occupied" && status === "maintenance") {
				throw new AppError("Check out all tenants first", 400);
			}

			// cannot move maintenance -> occupied directly
			if (room.status === "maintenance" && status === "occupied") {
				throw new AppError("Room must become available first", 400);
			}

			room.status = status;
		}

		if (amenities) room.amenities = amenities;
		if (rent) room.rent = rent;
		if (type) room.type = type;

		await room.save();

		res.json({
			success: true,
			room
		});
	} catch (error) {
		next(error);
	}
};

//DELETE Room
//Only if: status === "available" AND no active tenants.

const deleteRoom = async (req, res, next) => {
	try {
		const room = await Room.findOne({
			_id: req.params.id,
			hostel: req.user.hostel
		});

		if (!room) {
			throw new AppError("Room not found", 404);
		}

		if (room.status !== "available") {
			throw new AppError("Only available rooms can be deleted", 400);
		}

		const activeTenant = await Tenant.findOne({
			room: room._id,
			status: "active"
		});

		if (activeTenants) {
			throw new AppError("Room still has active tenants", 400);
		}

		await room.deleteOne();

		res.json({
			success: true,
			message: "Room deleted"
		});
	} catch (error) {
		next(error);
	}
};

// GET Room stats
// returns a dashboard summary of this hostel

const getRoomStats = async (req, res, next) => {
	try {
		const hostel = req.user.hostel;

		const total = await Room.countDocuments({ hostel });
		const occupied = await Room.countDocuments({ hostel, status: "occupied"});
		const available = await Room.countDocuments({ hostel, status: "available"});
		const maintenance = await Room.countDocuments({ hostel, status: "maintenance"});

		res.json({
			success: true,
			total,
			occupied,
			available,
			maintenance
		});
	} catch (error) {
		next(error);
	}
};

module.exports = {
	createRoom,
	getRooms,
	getRoomById,
	updateRoom,
	deleteRoom,
	getRoomStats
};
