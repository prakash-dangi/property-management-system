const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        invoice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Invoice",
            required: true
        },

        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tenant",
            required: true
        },

        // Denormalized for fast querying - same hostel as the invoice
        hostel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hostel",
            required: true
        },

        // Amount paid in this specific payment
        amount: {
            type: Number,
            required: true,
            min: 0.01 // at least 1 paisa worth
        },

        method: {
            type: String,
            enum: ["cash", "upi", "bank_transfer", "cheque", "online"],
            required: true
        },

        // UPI: reference number; bank transfer: UTR; cheque: cheque number
        // Optional for cash — null values are excluded from the unique index
        transactionId: {
            type: String,
            trim: true
            // No default: null here — with a sparse unique index, an explicit null
            // is treated as a real value and causes duplicate key errors for cash
            // payments. By omitting the default, the field is genuinely absent
            // when not provided, and the sparse index correctly skips it.
        },

        // When the payment actually happened (can be backdated by staff)
        paidAt: {
            type: Date,
            default: Date.now
        },

        // Staff/owner who recorded this payment
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        notes: {
            type: String,
            trim: true
        },

        // ── Reversal / void tracking ─────────────────────────────────────
        // When a payment is voided (e.g. cheque bounced), we never delete
        // the document — we mark it voided for a complete audit trail.
        // The payment controller subtracts the amount from invoice.paidAmount
        // and re-derives the invoice status when voiding.
        voided: {
            type: Boolean,
            default: false
        },

        voidedAt: {
            type: Date
        },

        // Who voided it and why (required when voided = true)
        voidReason: {
            type: String,
            trim: true
        },

        // For future: receipt PDF URL from a storage provider
        receiptUrl: {
            type: String
            // No default: null — omit rather than store null
        }
    },
    {
        timestamps: true
    }
);

// ── Indexes ──────────────────────────────────────────────────────────────

// All payments for a specific invoice
paymentSchema.index({ invoice: 1 });

// Tenant payment history page
paymentSchema.index({ tenant: 1, createdAt: -1 });

// Hostel-level payment reporting
paymentSchema.index({ hostel: 1, paidAt: -1 });

// Duplicate UPI/bank transfer detection.
// We use a partialFilterExpression instead of sparse:true because Mongoose
// inserts `null` for missing optional string fields, and MongoDB's sparse index
// treats null as a real value (causing duplicate key errors for multiple cash
// payments). partialFilterExpression only indexes documents where transactionId
// is an actual string — null and missing fields are completely ignored.
paymentSchema.index(
    { hostel: 1, transactionId: 1 },
    {
        unique: true,
        partialFilterExpression: { transactionId: { $type: "string" } }
    }
);

module.exports = mongoose.model("Payment", paymentSchema);
