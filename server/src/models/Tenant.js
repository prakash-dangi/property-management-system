const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
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

        bedNumber: {
            type: Number
        },

        phone: String,

        emergencyContact: {
            name: String,
            relation: String,
            phone: String
        },

        joiningDate: {
            type: Date,
            default: Date.now
        },
        
        status: {
            type: String, 
            enum: ["active", "inactive", "left"],
            default: "active"
        },

        idProof: {
            url: String,
            publicId: String,
            uploadedAt: Date
        },
        
        notes: String
    },

    {
        timestamps: true
    }
);

tenantSchema.index({ hostel: 1, user: 1 }, { unique: true });
tenantSchema.index({ room: 1, bedNumber: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "active" }
    }
);

module.exports = mongoose.model("Tenant", tenantSchema);
