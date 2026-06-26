const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String, 
            required: true,
            unique: true,
            lowercase: true
        },

        password: {
            type: String,
            required: true,
            select: false
        },

        role: {
            type: String,
            enum: ["superadmin", "owner", "staff", "tenant"],
            default: "tenant"
        },

        phone: String, 
        
        avatar: String,

        isActive: {
            type: Boolean,
            default: true
        },

        mustChangePassword: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

userSchema.set("toJSON", {
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        delete ret.mustChangePassword;
        
        return ret;
    }
});

module.exports = mongoose.model("User", userSchema);
