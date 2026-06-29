const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
    {
        invoiceNumber: {
            type: String,
            required: true,
            unique: true
        },

        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tenant",
            required: true
        },

        hostel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hostel",
            required: true
        },

        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true
        },

        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },

        year: {
            type: Number,
            required: true,
            min: 2020
        },

        rentAmount: {
            type: Number,
            required: true,
            min: 0
        },

        extraCharges: [
            {
                label: { type: String, required: true },
                amount: { type: Number, required: true, min: 0 }
            }
        ],

        discount: {
            type: Number,
            default: 0,
            min: 0
        },

        // Computed on save: rentAmount + sum(extraCharges) - discount
        // Stored for fast querying - never trust client-sent value
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },

        dueDate: {
            type: Date,
            required: true
        },

        status: {
            type: String,
            enum: ["unpaid", "paid", "partially_paid", "overdue", "waived"],
            default: "unpaid"
        },

        // Tracks how much has been paid against this invoice
        // 0 for unpaid, < totalAmount for partially_paid, === totalAmount for paid
        paidAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        notes: String,

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

// -- Indexes --
// The most common query: "all invoices for hostel X in month/year Y"
invoiceSchema.index({ hostel: 1, year: 1, month: 1 });

// Idempotency check: "does this tenant already have an invoice for this month?"
// This is the key index that makes generateInvoices fast and safe
invoiceSchema.index({ tenant: 1, month: 1, year: 1 }, { unique: true });

// For the tenant portal: "show me my invoices"
invoiceSchema.index({ tenant: 1, status: 1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
