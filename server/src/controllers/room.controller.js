const Room = require("../models/Room");
const Tenant = require("../models/Tenant");
const Hostel = require("../models/Hostel");
const AppError = require("../utils/AppError");
const verifyHostelAccess = require("../utils/verifyHostelAccess");

// Create Room
// POST /api/hostels/:hostelId/rooms
// Only owner/staff can call this
// status is forced to "available" on creation
const createRoom = async (req, res, next) => {
	try {
		await verifyHostelAccess(req.params.hostelId, req.user);

		const room = await Room.create({
			...req.body,
			hostel: req.params.hostelId, // from URL
			status: "available"
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
//GET /api/hostels/:hostelId/rooms
//Supports: ?floor=2 &type=double &status=available

const getRooms = async (req, res, next) => {
	try {
		await verifyHostelAccess(req.params.hostelId, req.user);

		const filter = {
			hostel: req.params.hostelId
		};

		if (req.query.floor) filter.floor = req.query.floor;

		if (req.query.type) filter.type = req.query.type;

		if (req.query.status) filter.status = req.query.status;

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

// GET Room by ID
// GET /api/hostels/:hostelId/rooms/:id
const getRoomById = async (req, res, next) => {
	try {
		await verifyHostelAccess(req.params.hostelId, req.user);

		const room = await Room.findOne({
			_id: req.params.id,
			hostel: req.params.hostelId
		});

		if (!room) {
			throw new AppError("Room not found", 404);
		}

		const tenants = await Tenant.find({
			room: room._id,
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
// PUT /api/hostels/:hostelId/rooms/:id
// Allowed fields: amenities, rent, type, status
// Status transitions are guarded by a state machine
const updateRoom = async (req, res, next) => {
	try {
		await verifyHostelAccess(req.params.hostelId, req.user);

		const room = await Room.findOne({
			_id: req.params.id,
			hostel: req.params.hostelId
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

// DELETE Room
// DELETE /api/hostels/:hostelId/rooms/:id
// Only if: status === "available" AND no active tenants.
const deleteRoom = async (req, res, next) => {
	try {
		await verifyHostelAccess(req.params.hostelId, req.user);

		const room = await Room.findOne({
			_id: req.params.id,
			hostel: req.params.hostelId
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

		if (activeTenant) {
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
// GET /api/hostels/:hostelId/rooms/stats
// returns a dashboard summary of this hostel
const getRoomStats = async (req, res, next) => {
	try {
		await verifyHostelAccess(req.params.hostelId, req.user);

		const hostelId = req.params.hostelId;

		const total       = await Room.countDocuments({ hostel: hostelId });
		const occupied    = await Room.countDocuments({ hostel: hostelId, status: "occupied"});
		const available   = await Room.countDocuments({ hostel: hostelId, status: "available"});
		const maintenance = await Room.countDocuments({ hostel: hostelId, status: "maintenance"});

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

// GET /api/hostels/:hostelId/rooms/:id/availability
// Returns capacity, how many beds are taken, which beds are free
const getRoomAvailability = async (req, res, next) => {
	try {
		await verifyHostelAccess(req.params.hostelId, req.user);
		const room = await Room.findOne({
			_id: req.params.id,
			hostel: req.params.hostelId
		});

		if (!room) {
			throw new AppError("Room not found", 404);
		}

		// Count and get bed numbers of active tenants
		const activeTenants = await Tenant.find({
			room: room._id,
			status: "active"
		}).select("bedNumber user").populate("user", "name");

		const takenBeds = activeTenants.map(t => t.bedNumber);

		// Build a list of all available beds
		const availableBeds = [];
		for (let i = 1; i <= room.capacity; i++) {
			if (!takenBeds.includes(i)) {
				availableBeds.push(i);
			}
		}

		res.json({
			success: true,
			roomNumber: room.roomNumber,
			capacity: room.capacity,
			occupied: takenBeds.length,
			availableBeds,
			// Useful for showing which tenant is in which bed
			bedAssignments: activeTenants.map(t => ({
				bedNumber: t.bedNumber,
				tenantName: t.user?.name
			}))
		});
	} catch (error) {
		next(error);
	}
};

const getRoomHistory = async (req, res, next) => {
	try {
		await verifyHostelAccess(req.params.hostelId, req.user);

		const room = await Room.findOne({
			_id: req.params.id,
			hostel: req.params.hostelId
		});

		if (!room) {
			throw new AppError("Room not found", 404);
		}

		// All past tenants (vacated) sorted most recent first
		const history = await Tenant.find({
			room: room._id,
			status: "vacated"
		})
			.populate("user", "name email phone")
			.select("user bedNumber checkInDate checkOutDate daysStayed notes")
			.sort({ checkOutDate: -1 });

		// Enrich each record with days stayed (computed, not stored)
		const enriched = history.map(t => {
			const days = t.checkOutDate && t.checkInDate
				? Math.ceil((t.checkOutDate - t.checkInDate) / (1000 * 60 * 60 * 24))
				: null;
			return {
				...t.toObject(),
				daysStayed: days
			};
		});

		res.json({
			success: true,
			count: enriched.length,
			room: { _id: room._id, roomNumber: room.roomNumber, type: room.type },
			history: enriched
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
	getRoomStats,
	getRoomAvailability,
	getRoomHistory

};
