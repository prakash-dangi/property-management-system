require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./src/routes/auth.routes");
const roomRoutes = require("./src/routes/room.routes");
const hostelRoutes = require("./src/routes/hostel.routes");
const tenantRoutes = require("./src/routes/tenant.routes");
const invoiceRoutes = require("./src/routes/invoice.routes");
const paymentRoutes = require("./src/routes/payment.routes");
const tenantPortalRoutes = require("./src/routes/tenantPortal.routes");

const errorMiddleware = require("./src/middleware/error.middleware");

const connect = require("./src/config/db");

connect();

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/hostels", hostelRoutes);
app.use("/api/hostels/:hostelId/rooms", roomRoutes);
app.use("/api/hostels/:hostelId/tenants", tenantRoutes);
app.use("/api/hostels/:hostelId/invoices", invoiceRoutes);
app.use("/api/hostels/:hostelId/payments", paymentRoutes);
app.use("/api/portal", tenantPortalRoutes);

app.get("/", (req, res) => {
    res.send("Server Running");
});

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
