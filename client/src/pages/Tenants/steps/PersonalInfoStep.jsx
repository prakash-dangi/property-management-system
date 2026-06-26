import { useFormContext } from "react-hook-form";

// Props: onNext - function to advance to next step
export default function PersonalInfoStep({ onNext }) {
	const { register, formState: { errors }, trigger } = useFormContext();

	// Validate only the fields in this step before advancing
	const handleNext = async () => {
		const valid = await trigger(["name", "email", "phone"]);
		if (valid) onNext();
	};

	return (
		<div className="space-y-4">
			<h2 className="text-lg font-semibold text-gray-700">Step 1 - Personal Info</h2>
			{/* Name */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Full Name <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					placeholder="Full Name"
					{...register("name", {required: "Name is required" })}
					className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				{errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
			</div>

			{/* Email */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Email <span className="text-red-500">*</span>
				</label>
				<input
					type="email"
					placeholder="Email"
					{...register("email", {
						required: "Email is required",
						pattern: { value: /^\S+@\S+$/i, message: "Enter a valid email" }
					})}
					className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				{errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
			</div>

			{/* Phone */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Phone <span className="text-red-500">*</span>
				</label>
				<input
					type="tel"
					placeholder="Phone"
					{...register("phone", { required: "Phone is required" })}
					className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				{errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
			</div>

			{/* Date of Birth */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
				<input
					type="date"
					{...register("dob")}
					className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			{/* Gender */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
				<select
					{...register("gender")}
					className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">Select gender</option>
					<option value="male">Male</option>
					<option value="female">Female</option>
					<option value="other">Other</option>
				</select>
			</div>
			
			<div className="flex justify-end pt-2">
				<button
					type="button"
					onClick={handleNext}
					className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
				>
					Next →
				</button>
			</div>
		</div>
	);
}
