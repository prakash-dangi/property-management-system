const express = require("express");
const router = express.Router();

const tenantPortalController = require("../controllers/tenantPortal.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// All portal routes: must be logged in AND must be a tenant
router.use(protect);
router.use(authorize("tenant"));

// GET /api/portal/me
// Full own profile: user info, room, hostel, check-in date, id proof
router.get("/me", tenantPortalController.getTenantProfile);

// GET /api/portal/my-room
// Room details + bed grid + roommate names (no private info)
router.get("/my-room", tenantPortalController.getMyRoom);

module.exports = router;