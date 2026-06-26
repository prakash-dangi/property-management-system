import toast from "react-hot-toast";

// Props:
// open 	- boolean
// on close 	- function
// credentials 	- { email, tempPassword }

export default function CredentialsModal({ open, credentials, onClose }) {
	if (!open || !credentials) return null;

	const copyPassword = () => {
		navigator.clipboard.writeText(credentials.tempPassword);
		toast.success("Password copied to clipboard!");
	};

	return (
		// Backdrop
		<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
				{/* Header */}
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl">
						✓
					</div>
					<div>
						<h2 className="text-lg font-semibold text-gray-800">Tenant Created!</h2>
						<p className="text-sm text-gray-500">Share these credentials with the tenant.</p>
					</div>
				</div>
				
				{/* Credentials */}
				<div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
					<div>
						<p className="text-xs text-gray-500 mb-0.5">Email</p>
						<p className="text-sm font-medium text-gray-800">{credentials.email}</p>
					</div>
					<div>
						<p className="text-xs text-gray-500 mb-0.5">Temporary Password</p>
						<div className="flex items-center gap-2">
							<p className="text-sm font-mono font-bold text-gray-800 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
								{credentials.tempPassword}
							</p>
							<button
								onClick={copyPassword}
								className="text-xs text-blue-600 hover:text-blue-800 underline"
							>
								Copy
							</button>
						</div>
					</div>
				</div>
				<p className="text-xs text-gray-400">
					An email has also been sent to the tenant. They must change this password on first login.
				</p>

				<button
					onClick={onClose}
					className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
				>
					Done
				</button>
			</div>
		</div>
	);
}
