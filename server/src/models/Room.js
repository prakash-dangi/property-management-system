const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        hostel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hostel",
            required: true
        },

        roomNumber: {
            type: String,
            required: true
        },

        floor: Number,

        type: {
            type: String,
            enum: ["single", "double", "triple", "dormitory"]
        },

        capacity: Number,

        tenants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Tenant"
            }
        ],

        rent: Number,

        amenities: [String],

        status: {
            type: String,
            enum: ["available", "occupied", "maintenance"],
            default: "available"
        }
    },

    {
        timestamps: true
    }
);

roomSchema.index(
    {
        hostel: 1,
        roomNumber: 1
    },
    {
        unique: true
    }
);

module.exports = mongoose.model("Room", roomSchema);
