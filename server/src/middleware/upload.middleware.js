const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary/lib");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
	cloudinary,
	params: {
		folder: "hostel-id-proofs",
		allowed_formats: ["jpg", "jpeg", "png", "pdf"]
	}
});

const upload = multer({
	storage,
	limits: {
		fileSize: 5 * 1024 * 1024 // 5 MB limit
	}
});

module.exports = upload;
