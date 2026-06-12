const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
    {
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

        month: Number,

        year: Number,

        rentAmount: Number,

        extraCharges: [
            {
                label: String,
                amount: Number
            }
        ],

        totalAmount: Number,

        dueDate: Date,

        status: {
            type: String,
            enum: ["unpaid", "paid", "overdue"],
            default: "unpaid"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
