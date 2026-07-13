const crypto = require("crypto");
const mongoose = require("mongoose");

const razorpay = require("../config/razorpay");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const Tenant = require("../models/Tenant");
const RazorpayOrder = require("../models/RazorpayOrder");
const AppError = require("../utils/AppError");

// Re-use the same status derivation logic as manual payments.
// This is the single source of truth for invoice status transitions.
// It lives in payment.controller.js — extract it to a shared util if needed.
const deriveInvoiceStatus = (invoice) => {
    if (invoice.paidAmount <= 0) {
        return new Date() > invoice.dueDate ? "overdue" : "unpaid";
    }
    if (invoice.paidAmount >= invoice.totalAmount) {
        return "paid";
    }
    return "partially_paid";
};


// ── POST /api/portal/razorpay/create-order ────────────────────────────────
// Creates a Razorpay Order for the tenant to pay an invoice.
//
// Security: tenant can ONLY create an order for their OWN invoice.
// The invoice is looked up by _id AND tenant._id — a tenant cannot pay
// another tenant's invoice by guessing an invoice ID.
//
// Amount: received in rupees (matching the UI display), converted to paise
// for Razorpay. Razorpay requires integer paise — no floats.

exports.createOrder = async (req, res, next) => {
    try {
        const { invoiceId, amount } = req.body;

        if (!invoiceId) throw new AppError("invoiceId is required", 400);
        if (!amount || amount <= 0) throw new AppError("amount must be > 0", 400);
        if (amount < 1) throw new AppError("Minimum payment amount is ₹1", 400);

        // ── Find the tenant record for this logged-in user ──────────────
        // Security: derive tenant from req.user._id — not from request body
        const tenant = await Tenant.findOne({
            user: req.user._id,
            status: "active"
        }).populate("hostel", "name");

        if (!tenant) {
            throw new AppError("No active tenant record found for your account", 404);
        }

        // ── Find the invoice — scoped to this tenant ────────────────────
        // A tenant CAN NOT pay invoices of other tenants.
        const invoice = await Invoice.findOne({
            _id: invoiceId,
            tenant: tenant._id
        });

        if (!invoice) {
            throw new AppError("Invoice not found or does not belong to your account", 404);
        }

        // ── Business rule checks ────────────────────────────────────────
        if (invoice.status === "paid") {
            throw new AppError("This invoice is already fully paid", 400);
        }
        if (invoice.status === "waived") {
            throw new AppError("This invoice has been waived — no payment needed", 400);
        }

        const remaining = Math.round((invoice.totalAmount - invoice.paidAmount) * 100) / 100;

        if (amount > remaining) {
            throw new AppError(
                `Payment amount (₹${amount}) exceeds remaining balance (₹${remaining})`,
                400
            );
        }

        // ── Convert to paise ────────────────────────────────────────────
        // Razorpay requires integer paise. Math.round prevents any float issues.
        // Example: ₹5000 → 500000 paise
        const amountPaise = Math.round(amount * 100);

        const existingOrder = await RazorpayOrder.findOne({
            invoice: invoice._id,
            status: "created",
            expiresAt: { $gt: new Date() }  // not yet expired
        });

        if (existingOrder) {
            // Reuse the existing order instead of creating a new one
            return res.json({
                success: true,
                orderId: existingOrder.razorpayOrderId,
                amount: existingOrder.amountPaise,
                currency: "INR",
                receipt: existingOrder.receipt,
                key: process.env.RAZORPAY_KEY_ID,
                // ... rest of fields
            });
        }

        // ── Create Razorpay Order ────────────────────────────────────────
        const razorpayOrder = await razorpay.orders.create({
            amount: amountPaise,
            currency: "INR",
            receipt: invoice.invoiceNumber,        // shown in Razorpay dashboard
            notes: {
                invoiceId: invoice._id.toString(),
                tenantId: tenant._id.toString(),
                hostelId: tenant.hostel._id.toString(),
                month: invoice.month,
                year: invoice.year
            }
        });

        // ── Save the order to our DB ─────────────────────────────────────
        // This is the idempotency gate for webhooks.
        // expiresAt: Razorpay orders expire after 15 minutes by default.
        await RazorpayOrder.create({
            razorpayOrderId: razorpayOrder.id,
            invoice: invoice._id,
            tenant: tenant._id,
            hostel: tenant.hostel._id,
            amountPaise,
            currency: "INR",
            receipt: invoice.invoiceNumber,
            status: "created",
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });

        // ── Respond with everything the frontend needs ───────────────────
        // key_id is the PUBLIC key — safe to send.
        res.status(201).json({
            success: true,
            orderId: razorpayOrder.id,
            amount: amountPaise,
            currency: "INR",
            receipt: invoice.invoiceNumber,
            key: process.env.RAZORPAY_KEY_ID,
            invoiceId: invoice._id,
            tenantName: req.user.name,
            hostelName: tenant.hostel.name,
            description: `Rent for ${getMonthName(invoice.month)} ${invoice.year}`
        });

    } catch (error) {
        // Handle Razorpay API errors specifically
        // Razorpay SDK throws objects with { error: { description } }
        if (error.error?.description) {
            return next(new AppError(`Razorpay error: ${error.error.description}`, 502));
        }
        next(error);
    }
};


// ── POST /api/webhooks/razorpay ───────────────────────────────────────────
// Razorpay calls this endpoint after every payment event.
//
// This is the AUTHORITATIVE handler. Database is only updated here,
// never from the frontend success callback.
//
// Critical requirements:
//   1. This route must receive the RAW body string (not JSON.parse'd)
//      for HMAC verification to work. See webhook.routes.js for how.
//   2. No authentication — Razorpay is the caller.
//   3. Must return 200 quickly — Razorpay retries on non-200.
//   4. Must be idempotent — the same webhook may arrive multiple times.

exports.webhookRazorpay = async (req, res, next) => {
    // ── Step 1: Verify HMAC signature ────────────────────────────────────
    // req.rawBody is the raw Buffer/string attached by the rawBodySaver middleware
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
        // Razorpay always sends this header. Missing = not from Razorpay.
        return res.status(401).json({ message: "Missing webhook signature" });
    }

    const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(req.rawBody)    // MUST use raw body string, not JSON.stringify(req.body)
        .digest("hex");

    if (!crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
    )) {
        // Return 401 for invalid signatures.
        // This is the one case where we don't return 200 — we WANT Razorpay
        // to know the signature was wrong so they can investigate.
        return res.status(401).json({ message: "Invalid webhook signature" });
    }

    // ── Step 2: Extract event details ─────────────────────────────────────
    const event = req.body.event;
    const payload = req.body.payload;

    // ── Step 3: Route by event type ───────────────────────────────────────
    // Only handle events we care about. All others: acknowledge and ignore.
    try {
        if (event === "payment.captured") {
            await handlePaymentCaptured(payload);
        } else if (event === "payment.failed") {
            await handlePaymentFailed(payload);
        }
        // Other events (refund.created, order.paid, etc.) are ignored for now.

        // Return 200 immediately — database work is done.
        return res.json({ received: true });

    } catch (error) {
        // Log the error but still return 200 so Razorpay stops retrying.
        // The error is captured in the RazorpayOrder document for investigation.
        console.error("[Webhook] Error processing event:", event, error.message);
        return res.json({ received: true });
    }
};


// ── GET /api/portal/razorpay/order-status/:razorpayOrderId ───────────────
// Frontend polls this after the Razorpay Checkout success callback
// to confirm the payment was processed server-side.

exports.getOrderStatus = async (req, res, next) => {
    try {
        const tenant = await Tenant.findOne({
            user: req.user._id,
            status: "active"
        });

        if (!tenant) throw new AppError("Tenant not found", 404);

        const order = await RazorpayOrder.findOne({
            razorpayOrderId: req.params.razorpayOrderId,
            tenant: tenant._id  // Security: tenant can only see their own orders
        }).populate("invoice", "invoiceNumber month year status paidAmount totalAmount")
            .populate("payment", "amount method paidAt");

        if (!order) throw new AppError("Order not found", 404);

        res.json({
            success: true,
            status: order.status,
            invoice: order.invoice,
            payment: order.payment
        });
    } catch (error) {
        next(error);
    }
};


// ── Internal handler: payment.captured ───────────────────────────────────

async function handlePaymentCaptured(payload) {
    const paymentEntity = payload.payment.entity;
    const razorpayOrderId = paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity.id;
    const razorpaySignature = paymentEntity.signature || null;

    // ── Idempotency check ─────────────────────────────────────────────────
    // If this order was already processed, return immediately.
    // Razorpay retries webhooks up to 3x — this prevents duplicate payments.
    const existingOrder = await RazorpayOrder.findOne({ razorpayOrderId });

    if (!existingOrder) {
        // Order not found — could be from a different system or test.
        // Log and ignore.
        console.error("[Webhook] Unknown razorpayOrderId:", razorpayOrderId);
        return;
    }

    if (existingOrder.status === "captured") {
        // Already processed — safe to return, nothing to do.
        console.log("[Webhook] Duplicate webhook ignored for order:", razorpayOrderId);
        return;
    }

    // ── Fetch the invoice ─────────────────────────────────────────────────
    const invoice = await Invoice.findById(existingOrder.invoice);

    if (!invoice) {
        console.error("[Webhook] Invoice not found for order:", razorpayOrderId);
        return;
    }

    // Edge case: invoice was paid by another channel while this order was pending
    if (invoice.status === "paid") {
        // Mark order as captured but don't double-record the payment
        await RazorpayOrder.findByIdAndUpdate(existingOrder._id, {
            status: "captured",
            razorpayPaymentId,
            webhookPayload: payload
        });
        return;
    }

    // ── Amount validation ─────────────────────────────────────────────────
    // paymentEntity.amount is in paise
    const paidRupees = paymentEntity.amount / 100;
    const remaining = Math.round((invoice.totalAmount - invoice.paidAmount) * 100) / 100;

    if (paidRupees > remaining + 0.01) {
        // Overpayment — log for manual review
        console.error("[Webhook] Overpayment detected:", {
            razorpayOrderId,
            paidRupees,
            remaining
        });
        // Still process it — clamp to remaining and flag for manual reconciliation
        // (alternatively you can reject and issue a Razorpay refund here)
    }

    const actualAmount = Math.min(paidRupees, remaining);

    // ── Mongoose transaction — atomic write ───────────────────────────────
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        // Create Payment document (same structure as manual payments)
        const [payment] = await Payment.create([{
            invoice: invoice._id,
            tenant: existingOrder.tenant,
            hostel: existingOrder.hostel,
            amount: actualAmount,
            method: "razorpay",
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
            paidAt: new Date(paymentEntity.created_at * 1000), // Razorpay uses Unix timestamp
            recordedBy: existingOrder.tenant,    // tenant "recorded" their own payment
            notes: `Razorpay payment — ${paymentEntity.method}` // UPI, card, netbanking etc.
        }], { session });

        // Update invoice — same Math.round pattern as manual payments
        invoice.paidAmount = Math.round((invoice.paidAmount + actualAmount) * 100) / 100;
        invoice.status = deriveInvoiceStatus(invoice);
        await invoice.save({ session });

        // Update the order record
        await RazorpayOrder.findByIdAndUpdate(
            existingOrder._id,
            {
                status: "captured",
                razorpayPaymentId,
                payment: payment._id,
                webhookPayload: payload   // store full payload for audit
            },
            { session }
        );

        await session.commitTransaction();
        console.log("[Webhook] Payment captured:", razorpayPaymentId, "₹" + actualAmount);

        await sendPaymentReceipt({
            tenantEmail: tenant.user.email,
            invoiceNumber: invoice.invoiceNumber,
            amount: actualAmount,
            razorpayPaymentId
        });

    } catch (error) {
        await session.abortTransaction();
        throw error;  // Let the caller handle logging
    } finally {
        session.endSession();
    }
}


// ── Internal handler: payment.failed ─────────────────────────────────────

async function handlePaymentFailed(payload) {
    const paymentEntity = payload.payment.entity;
    const razorpayOrderId = paymentEntity.order_id;

    // Mark the order as failed. Don't update the invoice — no money moved.
    await RazorpayOrder.findOneAndUpdate(
        { razorpayOrderId },
        {
            status: "failed",
            webhookPayload: payload
        }
    );

    console.log("[Webhook] Payment failed for order:", razorpayOrderId,
        "Error:", paymentEntity.error_description);
}


// ── Helper ────────────────────────────────────────────────────────────────

function getMonthName(month) {
    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return names[month - 1] || month;
}