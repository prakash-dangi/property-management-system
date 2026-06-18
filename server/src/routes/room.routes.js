const express = require("express");
const router = express.Router({mergeParams: true});

const {
	createRoom,
	getRooms,
	getRoomById,
	updateRoom,
	deleteRoom,
	getRoomStats
 } = require("../controllers/room.controller");

const {
	protect,
	authorize
} = require("../middleware/auth.middleware");

// GET /api/hostels/:hostelId/rooms/stats
router.get(
	"/stats",
	protect,
	getRoomStats
);

// POST /api/hostels/:hostelId/rooms
// Create a new room. Owner and staff only.
router.post(
	"/",
	protect,
	authorize("owner", "staff"),
	createRoom
);

// GET /api/hostels/:hostelId/rooms
// List rooms. Supports ?floor= &type= &status=
router.get(
	"/",
	protect,
	getRooms
);

// GET /api/hostels/:hostelId/rooms/:id
// Single room with active tenants populated.
router.get(
	"/:id",
	protect,
	getRoomById
);

// PUT /api/hostels/:hostelId/rooms/:id
// Update room fields + status (with state machine)
router.put(
	"/:id",
	protect,
	authorize("owner", "staff"),
	updateRoom
);

router.delete(
	"/:id",
	protect,
	authorize("owner"),
	deleteRoom
);

module.exports = router;
