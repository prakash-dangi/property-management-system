const express = require("express");
const router  = express.Router({ mergeParams: true });

const paymentController = require("../controllers/payment.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

router.use(protect);

// ── Record a payment ───────────────────────────────────────────────────
// POST /api/hostels/:hostelId/payments
// Staff can record payments, owner can too
router.post(
    "/",
    authorize("owner", "staff"),
    paymentController.recordPayment
);

// ── All payments for a hostel (with filters) ───────────────────────────
// GET /api/hostels/:hostelId/payments
// ?tenant= &method= &from= &to= &page= &limit=
router.get(
    "/",
    authorize("owner", "staff"),
    paymentController.getPayments
);

// ── Payment history for a specific tenant ─────────────────────────────
// GET /api/hostels/:hostelId/payments/tenant/:tenantId
// Must be ABOVE /:id routes to avoid Express matching "tenant" as an :id
router.get(
    "/tenant/:tenantId",
    authorize("owner", "staff"),
    paymentController.getTenantPaymentHistory
);

// ── Void a payment (cheque bounced / UPI reversed) ────────────────────
// DELETE /api/hostels/:hostelId/payments/:id
// Body: { reason } — required for audit trail
// Owner only — voiding is a financial decision
// Note: the payment record is NEVER deleted; it is soft-deleted (voided flag)
router.delete(
    "/:id",
    authorize("owner"),
    paymentController.voidPayment
);

module.exports = router;