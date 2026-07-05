const mongoose = require("mongoose");
const Invoice  = require("../models/Invoice");
const Tenant   = require("../models/Tenant");
const Hostel   = require("../models/Hostel");
const AppError = require("../utils/AppError");
const generateInvoiceNumber = require("../utils/invoiceNumber");
const verifyHostelAccess = require("../utils/verifyHostelAccess");

// --- Helper: compute totalAmount ---
// Always computed server-side. Never trust a client-sent totalAmount.
const computeTotal = (rentAmount, extraCharges = [], discount = 0) => {
    const extras = extraCharges.reduce((sum, e) => sum + (e.amount || 0), 0);
    return Math.max(0, rentAmount + extras - discount);
};

// POST /api/hostels/:hostelId/invoices/generate
// Body: { month: Number, year: Number, dueDay?: Number, extraCharges?: [] }
//
// Idempotent: safe to call multiple times. Already-invoiced tenants are skipped.
// Returns: { generated: N, skipped: M, invoices: [...newly created] }

exports.generateInvoices = async (req, res, next) => {
    try {
        await verifyHostelAccess(req.params.hostelId, req.user);

        const { month, year, dueDay = 5, extraCharges = [] } = req.body;

        // Validate month/year
        if (!month || !year || month < 1 || month > 12) {
            throw new AppError("Valid month (1-12) and year are required", 400);
        }

        // Step 1: Find ALL active tenants for this hostel, with room populated
        // We need room.rent for the invoice amount
        const activeTenants = await Tenant.find({
            hostel: req.params.hostelId,
            status: "active"
        }).populate("room", "rent _id");

        if (activeTenants.length === 0) {
            return res.json({
                success: true,
                message: "No active tenants found",
                generated: 0,
                skipped: 0
            });
        }

        // Step 2: Find which tenants already have an invoice for this month/year
        // One DB query to get all existing invoice tenant IDs — much more efficient
        // than checking each tenant individually in a loop
        const existing = await Invoice.find({
            hostel: req.params.hostelId,
            month,
            year
        }).select("tenant");

        const alreadyInvoicedIds = new Set(
            existing.map(inv => inv.tenant.toString())
        );

        // Step 3: Filter to only tenants who don't have an invoice yet
        const toInvoice = activeTenants.filter(
            t => !alreadyInvoicedIds.has(t._id.toString())
        );

        if (toInvoice.length === 0) {
            return res.json({
                success: true,
                message: "All active tenants already have invoices for this period",
                generated: 0,
                skipped: activeTenants.length
            });
        }

        // Step 4: Build invoice documents
        // We generate invoice numbers sequentially for this year.
        // Get the current last number once, then increment in-memory for the batch.
        // This avoids N sequential DB reads in the loop.
        const Invoice_ = require("../models/Invoice"); // already required above
        const last = await Invoice.findOne(
            { invoiceNumber: { $regex: `^INV-${year}-` } },
            { invoiceNumber: 1 }
        ).sort({ invoiceNumber: -1 });

        let sequence = 1;
        if (last) {
            sequence = parseInt(last.invoiceNumber.split("-")[2], 10) + 1;
        }

        const dueDate = new Date(year, month - 1, dueDay);

        const invoiceDocs = toInvoice.map((tenant) => {
            const rentAmount  = tenant.room?.rent || 0;
            const totalAmount = computeTotal(rentAmount, extraCharges, 0);

            const padded = String(sequence).padStart(3, "0");
            const invoiceNumber = `INV-${year}-${padded}`;
            sequence++;

            return {
                invoiceNumber,
                tenant: tenant._id,
                hostel: tenant.hostel,
                room:   tenant.room._id,
                month,
                year,
                rentAmount,
                extraCharges,  // same extras applied to all in bulk
                discount: 0,
                totalAmount,
                dueDate,
                status: "unpaid",
                paidAmount: 0,
                createdBy: req.user._id
            };
        });

        // Step 5: Bulk insert
        // ordered: false means if one fails (e.g. race condition duplicate),
        // the rest still get inserted. The errors are collected and returned.
        const inserted = await Invoice.insertMany(invoiceDocs, { ordered: false });

        res.status(201).json({
            success: true,
            generated: inserted.length,
            skipped: activeTenants.length - inserted.length,
            invoices: inserted
        });
    } catch (error) {
        // insertMany with ordered:false throws a BulkWriteError when
        // some documents succeeded and some failed. Still return partial success.
        if (error.code === 11000 || error.name === "BulkWriteError") {
            const inserted = error.insertedDocs || [];
            return res.status(207).json({
                success: true,
                message: "Some invoices were skipped due to duplicates",
                generated: inserted.length
            });
        }
        next(error);
    }
};

// POST /api/hostels/:hostelId/invoices
// For manually invoicing one tenant with custom amounts/charges

exports.createInvoice = async (req, res, next) => {
    try {
        await verifyHostelAccess(req.params.hostelId, req.user);

        const {
            tenantId,
            month,
            year,
            extraCharges = [],
            discount = 0,
            notes,
            dueDay = 5
        } = req.body;

        if (!tenantId || !month || !year) {
            throw new AppError("tenantId, month, and year are required", 400);
        }

        // Verify tenant belongs to this hostel
        const tenant = await Tenant.findOne({
            _id: tenantId,
            hostel: req.params.hostelId
        }).populate("room", "rent _id");

        if (!tenant) {
            throw new AppError("Tenant not found in this hostel", 404);
        }

        // Idempotency check for manual creation too
        const existing = await Invoice.findOne({
            tenant: tenantId,
            month,
            year
        });

        if (existing) {
            throw new AppError(
                `Invoice already exists for this tenant for ${month}/${year}. ` +
                `Invoice #${existing.invoiceNumber}`,
                409
            );
        }

        const invoiceNumber = await generateInvoiceNumber(year);
        const rentAmount    = tenant.room?.rent || 0;
        const totalAmount   = computeTotal(rentAmount, extraCharges, discount);
        const dueDate       = new Date(year, month - 1, dueDay);

        const invoice = await Invoice.create({
            invoiceNumber,
            tenant: tenant._id,
            hostel: req.params.hostelId,
            room:   tenant.room._id,
            month,
            year,
            rentAmount,
            extraCharges,
            discount,
            totalAmount,
            dueDate,
            status: "unpaid",
            paidAmount: 0,
            notes,
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, invoice });
    } catch (error) {
        next(error);
    }
};

// GET /api/hostels/:hostelId/invoices
// Query params: ?month= &year= &status= &tenant= &page= &limit=
//
// Design note: we don't do client-side filtering here (unlike tenants).
// All filtering is done at DB level because invoices can be large datasets.

exports.getInvoices = async (req, res, next) => {
    try {
        await verifyHostelAccess(req.params.hostelId, req.user);

        const { month, year, status, tenant, page = 1, limit = 20 } = req.query;

        const filter = { hostel: req.params.hostelId };

        if (month)  filter.month  = Number(month);
        if (year)   filter.year   = Number(year);
        if (status) filter.status = status;
        if (tenant) filter.tenant = tenant;

        const skip = (Number(page) - 1) * Number(limit);

        const [invoices, total] = await Promise.all([
            Invoice.find(filter)
                .populate("tenant", "_id user bedNumber")
                .populate({
                    path: "tenant",
                    populate: { path: "user", select: "name email phone" }
                })
                .populate("room", "roomNumber floor type")
                .sort({ year: -1, month: -1, createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Invoice.countDocuments(filter)
        ]);

        res.json({
            success: true,
            count: invoices.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            invoices
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/hostels/:hostelId/invoices/:id

exports.getInvoiceById = async (req, res, next) => {
    try {
        await verifyHostelAccess(req.params.hostelId, req.user);

        const invoice = await Invoice.findOne({
            _id: req.params.id,
            hostel: req.params.hostelId
        })
            .populate({
                path: "tenant",
                populate: { path: "user", select: "name email phone" }
            })
            .populate("room", "roomNumber floor type rent")
            .populate("createdBy", "name email");

        if (!invoice) {
            throw new AppError("Invoice not found", 404);
        }

        res.json({ success: true, invoice });
    } catch (error) {
        next(error);
    }
};

// PUT /api/hostels/:hostelId/invoices/:id
// Allowed: extraCharges, discount, notes, status (owner can waive)
// Not allowed: changing tenant, month, year, hostel, invoiceNumber
//
// totalAmount is always recomputed — never trust client input.
// paidAmount can be set here too (manual payment recording without a Payment doc)

exports.updateInvoice = async (req, res, next) => {
    try {
        await verifyHostelAccess(req.params.hostelId, req.user);

        const invoice = await Invoice.findOne({
            _id: req.params.id,
            hostel: req.params.hostelId
        });

        if (!invoice) {
            throw new AppError("Invoice not found", 404);
        }

        // Guard: can't edit a paid invoice's amounts
        if (invoice.status === "paid") {
            const { notes, status } = req.body;
            // Only notes can be changed on a paid invoice
            if (notes !== undefined) invoice.notes = notes;
            // Status can be changed from paid → waived in edge cases
            if (status === "waived") invoice.status = "waived";
            await invoice.save();
            return res.json({ success: true, invoice });
        }

        const { extraCharges, discount, notes, status, paidAmount } = req.body;

        if (extraCharges !== undefined) invoice.extraCharges = extraCharges;
        if (discount     !== undefined) invoice.discount     = discount;
        if (notes        !== undefined) invoice.notes        = notes;

        // Recompute total whenever amounts change
        invoice.totalAmount = computeTotal(
            invoice.rentAmount,
            invoice.extraCharges,
            invoice.discount
        );

        // Handle paidAmount update → auto-derive status
        if (paidAmount !== undefined) {
            invoice.paidAmount = paidAmount;
        }

        // Auto-derive status based on amounts
        // Only override if the caller didn't explicitly set status
        if (status !== undefined) {
            // Trust explicit status (waived, overdue can be manually set)
            invoice.status = status;
        } else {
            // Auto-derive from payment amounts
            if (invoice.paidAmount === 0) {
                // Only auto-set to overdue if due date has passed and not waived
                const isOverdue = new Date() > invoice.dueDate;
                invoice.status = isOverdue ? "overdue" : "unpaid";
            } else if (invoice.paidAmount >= invoice.totalAmount) {
                invoice.status = "paid";
            } else {
                invoice.status = "partially_paid";
            }
        }

        await invoice.save();
        res.json({ success: true, invoice });
    } catch (error) {
        next(error);
    }
};

// POST /api/hostels/:hostelId/invoices/mark-overdue
// Updates ALL unpaid AND partially_paid invoices past their dueDate to "overdue".
//
// Why include partially_paid?
// A tenant who paid ₹2000 of ₹5000 and missed the due date still owes ₹3000.
// Keeping them as "partially_paid" hides urgency. "overdue" is the correct
// status — partial payment does not reset the clock.
//
// The paidAmount is preserved. Only status changes.
// Safe to call multiple times — already-overdue invoices are not re-matched.

exports.markOverdueInvoices = async (req, res, next) => {
    try {
        await verifyHostelAccess(req.params.hostelId, req.user);

        const now = new Date();

        const result = await Invoice.updateMany(
            {
                hostel: req.params.hostelId,
                status: { $in: ["unpaid", "partially_paid"] },  // both statuses
                dueDate: { $lt: now }
            },
            { $set: { status: "overdue" } }
        );

        res.json({
            success: true,
            markedOverdue: result.modifiedCount
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/hostels/:hostelId/invoices/dues
// Returns all unpaid, partially_paid, and overdue invoices for this hostel.
// Supports: ?tenant= &page= &limit=
// Sorted: overdue first, then by dueDate ascending (most urgent at top)

exports.getDues = async (req, res, next) => {
    try {
        await verifyHostelAccess(req.params.hostelId, req.user);

        const { tenant, page = 1, limit = 20 } = req.query;

        const filter = {
            hostel: req.params.hostelId,
            status: { $in: ["unpaid", "partially_paid", "overdue"] }
        };
        if (tenant) filter.tenant = tenant;

        const skip = (Number(page) - 1) * Number(limit);

        // Custom sort: overdue > partially_paid > unpaid, then by dueDate
        const statusOrder = { overdue: 0, partially_paid: 1, unpaid: 2 };

        const [invoices, total] = await Promise.all([
            Invoice.find(filter)
                .populate({
                    path: "tenant",
                    populate: { path: "user", select: "name phone" }
                })
                .populate("room", "roomNumber floor")
                .sort({ dueDate: 1 }) // most overdue first within same status
                .skip(skip)
                .limit(Number(limit)),
            Invoice.countDocuments(filter)
        ]);

        // Sort overdue to top (MongoDB can't sort by enum order natively)
        const sorted = invoices.sort(
            (a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
        );

        // Compute total outstanding
        const totalOutstanding = sorted.reduce(
            (sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0
        );

        res.json({
            success: true,
            count: sorted.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            totalOutstanding: Math.round(totalOutstanding * 100) / 100,
            invoices: sorted
        });
    } catch (error) {
        next(error);
    }
};


// GET /api/hostels/:hostelId/invoices/dues/summary
// MongoDB aggregation for the dashboard widget.
// Returns: {
//   overdue:         { count: N, totalDue: ₹X },
//   partially_paid:  { count: N, totalDue: ₹X },
//   unpaid:          { count: N, totalDue: ₹X },
//   total:           { count: N, totalDue: ₹X }
// }

exports.getDuesSummary = async (req, res, next) => {
    try {
        await verifyHostelAccess(req.params.hostelId, req.user);

        const results = await Invoice.aggregate([
            {
                $match: {
                    hostel: new mongoose.Types.ObjectId(req.params.hostelId),
                    status: { $in: ["unpaid", "partially_paid", "overdue"] }
                }
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    // totalDue = sum of (totalAmount - paidAmount) per invoice
                    totalDue: {
                        $sum: { $subtract: ["$totalAmount", "$paidAmount"] }
                    }
                }
            }
        ]);

        // Reshape into a clean object keyed by status
        const summary = {
            overdue:        { count: 0, totalDue: 0 },
            partially_paid: { count: 0, totalDue: 0 },
            unpaid:         { count: 0, totalDue: 0 }
        };

        results.forEach(r => {
            if (summary[r._id] !== undefined) {
                summary[r._id] = {
                    count: r.count,
                    totalDue: Math.round(r.totalDue * 100) / 100
                };
            }
        });

        // Add totals for the dashboard headline number
        summary.total = {
            count: results.reduce((s, r) => s + r.count, 0),
            totalDue: Math.round(
                results.reduce((s, r) => s + r.totalDue, 0) * 100
            ) / 100
        };

        res.json({ success: true, summary });
    } catch (error) {
        next(error);
    }
};


// PUT /api/hostels/:hostelId/invoices/:id/waive
// Owner can waive any non-paid invoice.
// This writes off the debt — paidAmount stays unchanged, status → "waived".
// Waived invoices are excluded from pendingAmount in tenantSummary.js.
// Requires: { reason } in body (for audit trail in notes)

exports.waiveInvoice = async (req, res, next) => {
    try {
        await verifyHostelAccess(req.params.hostelId, req.user);

        const invoice = await Invoice.findOne({
            _id: req.params.id,
            hostel: req.params.hostelId
        });

        if (!invoice) throw new AppError("Invoice not found", 404);

        if (invoice.status === "paid") {
            throw new AppError("Cannot waive a paid invoice. It has already been settled.", 400);
        }
        if (invoice.status === "waived") {
            throw new AppError("Invoice is already waived", 400);
        }

        const { reason } = req.body;

        invoice.status = "waived";
        // Append reason to notes with timestamp for audit trail
        const waiveNote = `[Waived by owner on ${new Date().toLocaleDateString("en-IN")}` +
            (reason ? `: ${reason}` : "") + "]";
        invoice.notes = invoice.notes
            ? `${invoice.notes}\n${waiveNote}`
            : waiveNote;

        await invoice.save();

        res.json({
            success: true,
            message: "Invoice waived successfully",
            invoice
        });
    } catch (error) {
        next(error);
    }
};