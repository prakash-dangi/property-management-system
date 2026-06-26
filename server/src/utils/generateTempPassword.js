const crypto = require("crypto");

function generateTempPassword() {
	return crypto.randomBytes(6).toString("hex");
}

module.exports = generateTempPassword;
