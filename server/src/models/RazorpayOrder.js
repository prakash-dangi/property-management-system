const mongoose = require("mongoose");

const razorpayOrderSchema = new mongoose.Schema(
    {
        // Razorpay's own order ID, e.g. "order_PjcDjPBB1234"
        // Unique — Razorpay guarantees this. Used as the idempotency key.
        razorpayOrderId: {
            type: String,
            required: true,
            unique: true
        },

        // Razorpay payment ID — set when webhook confirms payment.captured
        // e.g. "pay_PjcDjPBB5678"
        razorpayPaymentId: {
            type: String
        },

        // Link to the Invoice being paid
        invoice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Invoice",
            required: true
        },

        // Link to the Tenant who initiated the payment
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tenant",
            required: true
        },

        // Denormalized for queries without joining
        hostel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hostel",
            required: true
        },

        // Amount IN PAISE (integer). Razorpay native unit.
        // This is the only model in the system that uses paise —
        // the Razorpay API requires it.
        // Display: amountPaise / 100 = rupees
        amountPaise: {
            type: Number,
            required: true,
            min: 100 // minimum ₹1
        },

        currency: {
            type: String,
            default: "INR"
        },

        // Order lifecycle:
        //   "created"   → Order created on Razorpay, tenant hasn't paid yet
        //   "attempted" → Tenant attempted payment (may have failed)
        //   "captured"  → Payment successful, webhook received and processed
        //   "failed"    → All payment attempts failed
        //   "expired"   → Order expired (Razorpay orders expire after 15 min by default)
        status: {
            type: String,
            enum: ["created", "attempted", "captured", "failed", "expired"],
            default: "created"
        },

        // The Razorpay Checkout "receipt" field — we use the invoice number.
        // Shown on Razorpay's dashboard for reconciliation.
        receipt: {
            type: String
        },

        // Full webhook payload stored for audit and debugging.
        // Never logged to console — only stored in DB.
        webhookPayload: {
            type: mongoose.Schema.Types.Mixed
        },

        // Link to the Payment document created after successful capture.
        // null until payment is captured.
        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment"
        },

        // When the Razorpay order expires (15 minutes after creation by default).
        // Use this to show the tenant a countdown or disable stale "Pay" buttons.
        expiresAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

// Fast lookup by invoice — "has any order been created for this invoice?"
razorpayOrderSchema.index({ invoice: 1 });

// Webhook arrives with razorpayOrderId — fast lookup for idempotency check
// (Index is automatically created by unique: true in the schema definition)
// Tenant history — "show me all my Razorpay orders"
razorpayOrderSchema.index({ tenant: 1, createdAt: -1 });

module.exports = mongoose.model("RazorpayOrder", razorpayOrderSchema);