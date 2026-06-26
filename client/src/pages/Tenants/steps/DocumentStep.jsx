import { useDropzone } from "react-dropzone";
import { useFormContext } from "react-hook-form";
import toast from "react-hot-toast";

const VALID_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// Props onNext, onPrev
export default function DocumentStep({ onNext, onPrev }) {
	const { register, setValue, watch, trigger } = useFormContext();

	const idProofFile = watch("idProof");

	const onDrop = (acceptedFiles) => {
		const file = acceptedFiles[0];
		if (!file) return;

		// Client-side validation
		if (!VALID_TYPES.includes(file.type)) {
			toast.error("Only JPG, PNG, or PDF files are allowed");
			return;
		}

		if (file.size > MAX_SIZE) {
			toast.error("File must be under 5MB");
			return;
		}

		// Store the File object in the form state
		// We use false as the second arg to skip validation triggering
		setValue("idProof", file, {
			shouldValidate: false
		});
		toast.success("File selected");
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		multiple: false,
		accept: {
			"image/jpeg": [],
			"image/png": [],
			"application/pdf": []
		}
	});

	const removeFile = () => setValue("idProof", null);

	const handleNext = async () => {
		const valid = await trigger(["emergencyContactName", "emergencyContactPhone"]);
		if (valid) onNext();
	};

	return (
		<div className="space-y-4">
			<h2 className="text-lg font-semibold text-gray-700">Step - Documents & Emergency Contact</h2>
			
			{/* ID Proof Type */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">ID Proof Type</label>
				<select
					{...register("idProofType")}
					className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">Select type</option>
					<option value="aadhaar">Aadhaar Card</option>
					<option value="pan">PAN Card</option>
					<option value="passport">Passport</option>
				</select>
			</div>
			
			{/* File Upload */}
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-1">
					Upload ID Document
				</label>
				
				{/* Show dropzone only if no file is selected */}
				{!idProofFile ? (
					<div
						{...getRootProps()}
						className={`
							border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
							${isDragActive
								? "border-blue-400 bg-blue-50"
								: "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
							}
						`}
					>
						<input {...getInputProps()} />
						<p className="text-sm text-gray-500">
							{isDragActive
								? "Drop the file here..."
								: "Drag & drop a file here, or click to browse"
							}
						</p>
						<p className="text-xs text-gray-400 mt-1">JPG, PNG, or PDF - max 5MB</p>
					</div>
				) : (
					// File preview after selection
					<div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
						{/* Image preview */}
						{idProofFile.type.startsWith("image/") && (
							<img 
								src={URL.createObjectURL(idProofFile)}
								alt="ID preview"
								className="max-h-48 rounded-lg object-contain mx-auto mb-3"
							/>
						)}

						{/* PDF info */}
						{idProofFile.type === "application/pdf" && (
							<div className="flex items-center gap-2 mb-3">
								<span className="text-2xl">📄</span>
								<span className="text-sm text-gray-700 font-medium">{idProofFile.name}</span>
							</div>
						)}
					
						<div className="flex items-center justify-between">
							<span className="text-xs text-gray-500">
								{(idProofFile.size / 1024).toFixed(1)} KB
							</span>
							<button
								type="button"
								onClick={removeFile}
								className="text-xs text-red-500 hover:text-red-700 underline"
							>
								Remove
							</button>
						</div>
					</div>
				)}
			</div>
			
			{/* Emergency Contact */}
			<div className="border-t border-gray-200 pt-4 space-y-3">
				<h3 className="text-sm font-semibold text-gray-700">Emergency Contact</h3>
				
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Name <span className="text-red-500">*</span>
					</label>
					<input 
						type="text"
						placeholder="Emergency Contact Name"
						{...register("emergencyContactName", {required: "Emergency contact name is required" })}
						className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Phone <span className="text-red-500">*</span>
					</label>
					<input 
						type="tel"
						placeholder="10-digit Phone Number"
						{...register("emergencyContactPhone", { required: "Emergency contact phone is required" })}
						className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
					<input
						type="text"
						placeholder="Relation"
						{...register("emergencyContactRelation")}
						className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
			</div>
			
			<div className="flex justify-between pt-2">
				<button
					type="button"
					onClick={onPrev}
					className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
				>
					← Back
				</button>

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
								
