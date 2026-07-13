const Razorpay = require("razorpay");

// Singleton instance — created once when the module is first required.
// Keeps connection overhead minimal.
// key_id is public — safe to log but NOT to expose in client bundle
// (we send it at runtime in the create-order response, not in .env.local)
// key_secret is private — NEVER sent to client, NEVER logged.

const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

module.exports = razorpay;