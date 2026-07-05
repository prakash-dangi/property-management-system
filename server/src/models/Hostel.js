const mongoose = require("mongoose");

const hostelSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        address: String,

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        phone: String,

        email: String,

        logo: String,

        staff: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        totalRooms: {
            type: Number,
            default: 0
        },

        subscriptionPlan: {
            type: String,
            enum: ["free", "basic", "pro"],
            default: "free"
        },

        subscriptionExpiry: Date,

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

hostelSchema.index(
    {
        owner: 1,
        name: 1
    },
    {
        unique: true
    }
);

module.exports = mongoose.model("Hostel", hostelSchema);

