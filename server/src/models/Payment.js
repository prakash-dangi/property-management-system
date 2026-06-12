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

        amount: Number,

        method: {
            type: String,
            enum: ["cash", "cheque", "online", "website"],
            default: "website"
        },

        transactionId: {
            type: String,
            default: null
        },

        paidAt: Date,

        recieptUrl: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Payment", paymentSchema);
