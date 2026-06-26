const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASSWORD
	}
});

async function sendTenantCredentials(email, password) {
	await transporter.sendMail({
		from: process.env.EMAIL_USER,
		to: email,
		subject: "Your Hostel Account Credentials",
		html: `
			<h2>Welcome to your new Hostel!</h2>
			<p>Your account has been successfully created.</p>
			<p><b>Email:</b> ${email}</p>
			<p><b>Temporary Password:</b> ${password}</p>
			<p>Please log in and change your password immediately.</p>
			`
	});
}

module.exports = sendTenantCredentials;
