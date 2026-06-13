const bcrypt = require("bcryptjs");
const User = require("../models/User");

const {
    generateAccessToken,
    generateRefreshToken
} = require("../utils/generateToken");

const jwt = require("jsonwebtoken");


const register = async (req, res) => {
    try {
        const {
            name,
            email,
            password
        } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        const accessToken = generateAccessToken(user._id);

        const refreshToken = generateRefreshToken(user._id);

        res.cookie(
            "refreshToken",
            refreshToken,
            {
                httpOnly: true,
                secure: false,
                sameSite: "strict"
            }
        );

        res.status(201).json({
            user,
            accessToken
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const login = async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        const user = User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(400).json({
                message: "Invalid credentials"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid credentials"
            });
        }

        const accessToken = generateAccessToken(user._id);

        const refreshToken = generateRefreshToken(user._id);

        res.cookie(
            "refreshToken",
            refreshToken,
            {
                httpOnly: true,
                secure: false,
                sameSite: "strict"
            }
        );

        user.password = undefined;

        res.json({
            user,
            accessToken
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getMe = async (req, res) => {
    const user = await User.findById(req.user.id);

    res.json(user);
};

const refresh = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;
        
        if (!token) {
            return res.status(401).json({
                message: "No refresh token"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_REFRESH_SECRET
        );

        const accessToken = generateAccessToken(decoded.id);

        res.json({
            accessToken
        });
    } catch (error) {
        res.status(401).json({
            message: "Invalid refresh token"
        });
    }
};

module.exports = {
    register,
    login,
    getMe,
    refresh
};