const express = require("express");
const router = express.Router({ mergeParams: true });
const upload = require("../middleware/upload.middleware");
const tenantController = require("../controllers/tenant.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// Ensure all tenant routes require login + owner/staff role
router.use(protect);
router.use(authorize("owner", "staff"));

router.post("/", upload.single("file"), tenantController.createTenant);
router.get("/", tenantController.getTenants);

// GET /api/hostels/:hostelId/tenants/:id/checkin-summary
// Read-only - no auth restriction beyond protect (staff can view too)
router.get("/:id/checkin-summary", tenantController.getCheckInSummary);

// PUT /api/hostels/:hostelId/tenants/:id/checkout
// ?force=true to bypass pending dues (owner only for safety, but staff allowed here)
router.put("/:id/checkout", tenantController.checkOutTenant);

router.get("/:id", tenantController.getTenantById);
router.put("/:id", tenantController.updateTenant);

// Middleware chain: auth -> upload single file -> controller
router.post("/:id/upload-id", upload.single("file"), tenantController.uploadIdProof);
    
module.exports = router;
