const express = require("express");
const router = express.Router();

const { createHostel } = require("../controllers/hostel.controller");

const { protect, authorize } = require("../middleware/auth.middleware");

router.post("/", protect, authorize("owner"), createHostel);

module.exports = router;
