const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
    {
        hostel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hostel"
        },

        category: String,

        description: String,

        amount: Number,

        date: Date,

        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    }, 
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Expense", expenseSchema);