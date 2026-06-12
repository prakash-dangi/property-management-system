const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
    {
        tenant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tenant"
        },

        hostel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hostel"
        },

        category: String,

        title: String,

        description: String,

        status: {
            type: String,
            enum: ["open", "in-progress", "resolved"],
            default: "open"
        },

        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        images: [String]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Complaint", complaintSchema);
