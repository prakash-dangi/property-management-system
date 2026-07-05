const express = require("express");
const router = express.Router({ mergeParams: true });

const invoiceController = require("../controllers/invoice.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// All invoice routes require login
router.use(protect);

// ── Generate invoices for a month — owner only ──────────────────────────
// POST /api/hostels/:hostelId/invoices/generate
// Must be above /:id routes or Express will match "generate" as an :id
router.post(
    "/generate",
    authorize("owner"),
    invoiceController.generateInvoices
);

// ── Mark overdue — owner only ───────────────────────────────────────────
// POST /api/hostels/:hostelId/invoices/mark-overdue
router.post(
    "/mark-overdue",
    authorize("owner"),
    invoiceController.markOverdueInvoices
);

// GET /api/hostels/:hostelId/invoices/dues/summary
// Must be first — "dues/summary" would be matched as /:id = "dues" otherwise
router.get(
    "/dues/summary",
    authorize("owner", "staff"),
    invoiceController.getDuesSummary
);

// GET /api/hostels/:hostelId/invoices/dues
router.get(
    "/dues",
    authorize("owner", "staff"),
    invoiceController.getDues
);

// ── Create single invoice manually — owner and staff ───────────────────
// POST /api/hostels/:hostelId/invoices
router.post(
    "/",
    authorize("owner", "staff"),
    invoiceController.createInvoice
);

// ── List invoices — owner and staff ────────────────────────────────────
// GET /api/hostels/:hostelId/invoices
router.get(
    "/",
    authorize("owner", "staff"),
    invoiceController.getInvoices
);

// PUT /api/hostels/:hostelId/invoices/:id/waive
// Must be BELOW /dues routes to avoid "waive" matching as :id
router.put(
    "/:id/waive",
    authorize("owner"),
    invoiceController.waiveInvoice
);  

// ── Single invoice — owner and staff ───────────────────────────────────
// GET /api/hostels/:hostelId/invoices/:id
router.get(
    "/:id",
    authorize("owner", "staff"),
    invoiceController.getInvoiceById
);

// ── Update invoice — owner and staff ───────────────────────────────────
// PUT /api/hostels/:hostelId/invoices/:id
router.put(
    "/:id",
    authorize("owner", "staff"),
    invoiceController.updateInvoice
);

module.exports = router;