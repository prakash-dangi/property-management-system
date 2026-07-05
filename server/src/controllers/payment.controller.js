const mongoose = require("mongoose");
const Invoice  = require("../models/Invoice");
const Payment  = require("../models/Payment");
const Tenant   = require("../models/Tenant");
const Hostel   = require("../models/Hostel");
const AppError = require("../utils/AppError");
const verifyHostelAccess = require("../utils/verifyHostelAccess");

// ── Derive invoice status from payment amounts ───────────────────────────
// Extracted into a function because it's used in both recordPayment
// and the reversal flow (future). Single source of truth for status logic.
const deriveInvoiceStatus = (invoice) => {
    if (invoice.paidAmount <= 0) {
        return new Date() > invoice.dueDate ? "overdue" : "unpaid";
    }
    if (invoice.paidAmount >= invoice.totalAmount) {
        return "paid";
    }
    return "partially_paid";
};


// ── POST /api/hostels/:hostelId/payments ─────────────────────────────────
// Record a manual payment against an invoice.
//
// Body:
//   invoiceId     — string (required)
//   amount        — number, in rupees (required)
//   method        — "cash" | "upi" | "bank_transfer" | "cheque" | "online" (required)
//   transactionId — string (required for non-cash)
//   paidAt        — ISO date string (optional, defaults to now)
//   notes         — string (optional)
//
// Business rules:
//   - Invoice must belong to this hostel (security)
//   - Invoice must not already be "paid" or "waived"
//   - amount must be > 0
//   - amount cannot exceed remaining balance (overpayment blocked)
//   - For UPI/bank_transfer: transactionId is required
//   - Both Payment creation and Invoice update happen in a transaction
//
// Returns: { payment, invoice } — the created payment + updated invoice

exports.recordPayment = async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const { hostelId } = req.params;
        await verifyHostelAccess(req.params.hostelId, req.user);

        const {
            invoiceId,
            amount,
            method,
            transactionId,
            paidAt,
            notes
        } = req.body;

        // ── Validation ────────────────────────────────────────────────
        if (!invoiceId) throw new AppError("invoiceId is required", 400);
        if (!amount || amount <= 0) throw new AppError("amount must be greater than 0", 400);
        if (!method) throw new AppError("payment method is required", 400);

        const validMethods = ["cash", "upi", "bank_transfer", "cheque", "online"];
        if (!validMethods.includes(method)) {
            throw new AppError(`method must be one of: ${validMethods.join(", ")}`, 400);
        }

        // UPI and bank transfer require a transaction ID for audit
        if (["upi", "bank_transfer"].includes(method) && !transactionId?.trim()) {
            throw new AppError("transactionId is required for UPI and bank transfers", 400);
        }

        // ── Fetch invoice (within session for consistency) ────────────
        const invoice = await Invoice.findOne({
            _id: invoiceId,
            hostel: hostelId
        }).session(session);

        if (!invoice) throw new AppError("Invoice not found in this hostel", 404);

        // ── Business rule checks ──────────────────────────────────────
        if (invoice.status === "paid") {
            throw new AppError("Invoice is already fully paid", 400);
        }
        if (invoice.status === "waived") {
            throw new AppError("Cannot record payment on a waived invoice", 400);
        }

        const remaining = Math.round((invoice.totalAmount - invoice.paidAmount) * 100) / 100;

        if (amount > remaining) {
            throw new AppError(
                `Payment amount (₹${amount}) exceeds remaining balance (₹${remaining}). ` +
                `Record ₹${remaining} or less.`,
                400
            );
        }

        // ── Create Payment document ───────────────────────────────────
        const [payment] = await Payment.create(
            [{
                invoice: invoice._id,
                tenant: invoice.tenant,
                hostel: hostelId,
                amount,
                method,
                transactionId: transactionId?.trim() || null,
                paidAt: paidAt ? new Date(paidAt) : new Date(),
                recordedBy: req.user._id,
                notes: notes?.trim() || undefined
            }],
            { session }
        );

        // ── Update Invoice ────────────────────────────────────────────
        // Use Math.round to prevent floating-point drift
        invoice.paidAmount = Math.round((invoice.paidAmount + amount) * 100) / 100;
        invoice.status = deriveInvoiceStatus(invoice);
        await invoice.save({ session });

        // ── Commit ───────────────────────────────────────────────────
        await session.commitTransaction();

        // Populate for the response
        const populatedPayment = await Payment.findById(payment._id)
            .populate("recordedBy", "name email");

        const populatedInvoice = await Invoice.findById(invoice._id)
            .populate({
                path: "tenant",
                populate: { path: "user", select: "name email phone" }
            })
            .populate("room", "roomNumber");

        res.status(201).json({
            success: true,
            message: `Payment of ₹${amount} recorded successfully`,
            payment: populatedPayment,
            invoice: populatedInvoice
        });

    } catch (error) {
        try { await session.abortTransaction(); } catch (_) {}
        next(error);
    } finally {
        session.endSession();
    }
};


// ── GET /api/hostels/:hostelId/payments/tenant/:tenantId ─────────────────
// Full payment history for a specific tenant.
// Returns payments sorted most recent first, with invoice details populated.

exports.getTenantPaymentHistory = async (req, res, next) => {
    try {
        const { hostelId, tenantId } = req.params;
        await verifyHostelAccess(req.params.hostelId, req.user);

        // Verify tenant belongs to this hostel
        const tenant = await Tenant.findOne({
            _id: tenantId,
            hostel: hostelId
        }).populate("user", "name email phone");

        if (!tenant) throw new AppError("Tenant not found in this hostel", 404);

        const payments = await Payment.find({ tenant: tenantId })
            .populate("invoice", "invoiceNumber month year totalAmount status")
            .populate("recordedBy", "name")
            .sort({ paidAt: -1 });

        // Compute lifetime summary
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

        res.json({
            success: true,
            tenant: { _id: tenant._id, user: tenant.user },
            count: payments.length,
            totalPaid: Math.round(totalPaid * 100) / 100,
            payments
        });
    } catch (error) {
        next(error);
    }
};


// ── GET /api/hostels/:hostelId/payments ──────────────────────────────────
// All payments for a hostel with optional filters.
// Query params: ?tenant= &method= &from= &to= &page= &limit=

exports.getPayments = async (req, res, next) => {
    try {
        const { hostelId } = req.params;
        await verifyHostelAccess(req.params.hostelId, req.user);

        const { tenant, method, from, to, page = 1, limit = 20 } = req.query;

        const filter = { hostel: hostelId };
        if (tenant) filter.tenant = tenant;
        if (method) filter.method = method;
        if (from || to) {
            filter.paidAt = {};
            if (from) filter.paidAt.$gte = new Date(from);
            if (to)   filter.paidAt.$lte = new Date(to);
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [payments, total] = await Promise.all([
            Payment.find(filter)
                .populate({
                    path: "tenant",
                    populate: { path: "user", select: "name email" }
                })
                .populate("invoice", "invoiceNumber month year totalAmount")
                .populate("recordedBy", "name")
                .sort({ paidAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Payment.countDocuments(filter)
        ]);

        const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

        res.json({
            success: true,
            count: payments.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            totalCollected: Math.round(totalCollected * 100) / 100,
            payments
        });
    } catch (error) {
        next(error);
    }
};


// ── DELETE /api/hostels/:hostelId/payments/:id ───────────────────────────
// "Void" a payment (e.g. a cheque bounced, UPI reversed by bank).
//
// We never hard-delete Payment documents — that would silently erase the
// audit trail. Instead we:
//   1. Mark payment.voided = true, record voidedAt + voidReason
//   2. Subtract payment.amount from invoice.paidAmount
//   3. Re-derive invoice status from the new amounts
//
// Body: { reason } — required; explains why the payment is being voided
//
// After voiding, the payment still appears in history with a "VOIDED" badge.
// The invoice goes back to unpaid / partially_paid / overdue automatically.
//
// Owner only — voiding a payment is a financial write-off decision.

exports.voidPayment = async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const { hostelId, id } = req.params;
        await verifyHostelAccess(hostelId, req.user);

        const { reason } = req.body;
        if (!reason?.trim()) {
            throw new AppError("A reason is required to void a payment", 400);
        }

        // ── Fetch payment within session ──────────────────────────────
        const payment = await Payment.findOne({
            _id: id,
            hostel: hostelId
        }).session(session);

        if (!payment) throw new AppError("Payment not found in this hostel", 404);

        if (payment.voided) {
            throw new AppError("Payment is already voided", 400);
        }

        // ── Fetch the linked invoice within the same session ──────────
        const invoice = await Invoice.findById(payment.invoice).session(session);

        if (!invoice) {
            // Edge case: invoice was somehow deleted; still allow voiding the payment
            // but skip the invoice update
            payment.voided    = true;
            payment.voidedAt  = new Date();
            payment.voidReason = reason.trim();
            await payment.save({ session });
            await session.commitTransaction();
            return res.json({ success: true, message: "Payment voided (invoice not found)", payment });
        }

        // Guard: can't void a payment on a waived invoice
        // (the invoice is already written off — voiding the payment changes nothing meaningful)
        if (invoice.status === "waived") {
            throw new AppError(
                "Cannot void a payment on a waived invoice. Unwaive the invoice first if needed.",
                400
            );
        }

        // ── Mark payment as voided ────────────────────────────────────
        payment.voided     = true;
        payment.voidedAt   = new Date();
        payment.voidReason = reason.trim();
        await payment.save({ session });

        // ── Recompute invoice.paidAmount by re-summing active payments ─
        // We don't just subtract payment.amount because floating-point
        // accumulated errors could make the total drift over many operations.
        // Re-summing all non-voided payments gives us the correct ground truth.
        const activePayments = await Payment.find({
            invoice: invoice._id,
            voided: { $ne: true }
        }).session(session);

        const newPaidAmount = activePayments.reduce((sum, p) => sum + p.amount, 0);
        invoice.paidAmount  = Math.round(newPaidAmount * 100) / 100;
        invoice.status      = deriveInvoiceStatus(invoice);
        await invoice.save({ session });

        // ── Commit both writes ────────────────────────────────────────
        await session.commitTransaction();

        res.json({
            success: true,
            message: "Payment voided. Invoice status updated.",
            payment,
            invoice: {
                _id:         invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                paidAmount:  invoice.paidAmount,
                totalAmount: invoice.totalAmount,
                status:      invoice.status
            }
        });

    } catch (error) {
        try { await session.abortTransaction(); } catch (_) {}
        next(error);
    } finally {
        session.endSession();
    }
};