const express = require("express");
const router  = express.Router();

const razorpayController = require("../controllers/razorpay.controller");

// ── Raw body middleware ────────────────────────────────────────────────────
// CRITICAL: Webhook HMAC verification requires the raw body string, not the
// JSON-parsed object. Express's json() middleware replaces req.body with a
// parsed object — the raw bytes are lost.
//
// Solution: before the main app.use(express.json()), we mount the webhook
// route with its own body parser that saves the raw string.
// This is done by mounting this router BEFORE app.use(express.json()) in index.js.

const rawBodySaver = (req, res, buf, encoding) => {
    // This is a verify callback passed to express.raw() or express.json()
    // It fires before JSON.parse and gives us the raw Buffer.
    if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || "utf8");
    }
};

// Use express.json with the rawBodySaver verify callback
// This gives us BOTH req.body (parsed) AND req.rawBody (string for HMAC)
router.post(
    "/razorpay",
    express.json({ verify: rawBodySaver }),
    razorpayController.webhookRazorpay
);

module.exports = router;