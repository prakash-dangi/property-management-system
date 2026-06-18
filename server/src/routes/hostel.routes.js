const express = require("express");
const router = express.Router();

const {
	createHostel,
	getMyHostels,
	getHostelById
} = require("../controllers/hostel.controller");

const { protect, authorize } = require("../middleware/auth.middleware");

// /api/hostels

router.post(
	"/",
	protect,
	authorize("owner"), 
	createHostel
);

router.get(
	"/",
	protect,
	authorize("owner"),
	getMyHostels
);

router.get(
	"/:id",
	protect,
	authorize("owner"),
	getHostelById
);

module.exports = router;
