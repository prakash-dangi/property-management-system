const express = require("express");
const router  = express.Router();

const razorpayController = require("../controllers/razorpay.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// All portal Razorpay routes require tenant authentication
router.use(protect);
router.use(authorize("tenant"));

// POST /api/portal/razorpay/create-order
router.post("/create-order", razorpayController.createOrder);

// GET /api/portal/razorpay/order-status/:razorpayOrderId
router.get("/order-status/:razorpayOrderId", razorpayController.getOrderStatus);

module.exports = router;