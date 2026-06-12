const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
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

        bedNumber: String,

        checkInDate: Date,

        checkOutDate: Date,

        idProofType: String,

        idProofUrl: String,

        emergencyContact: String,

        status: {
            type: String,
            enum: ["active", "vacated"],
            default: "active"
        }
    },

    {
        timestamps: true
    }
);

module.exports = mongoose.model("Tenant", tenantSchema);
