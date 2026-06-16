require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./src/routes/auth.routes");
const hostelRoutes = require("./src/routes/hostel.routes");
const errorMiddleware = require("./src/middleware/error.middleware");

const connect = require("./src/config/db");

connect();

const app = express();

app.use(cors({origin: "http://localhost:5173", credentials: true}));
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/hostels", hostelRoutes);
app.get("/", (req, res) => {
    res.send("Server Running");
});
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
