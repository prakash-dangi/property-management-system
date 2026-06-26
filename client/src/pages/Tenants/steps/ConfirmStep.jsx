import { useFormContext } from "react-hook-form";

const Row = ({ label, value }) => (
	<div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
		<span className="text-sm text-gray-500">{label}</span>
		<span className="text-sm font-medium text-gray-800">{value || "-"}</span>
	</div>
);

// Props: onPrev, onSubmit (async), isSubmitting
export default function ConfirmStep({ onPrev, onSubmit, isSubmitting }) {
	const { getValues } = useFormContext();
	const v = getValues();

	// Format a Date string for display
	const formatDate = (dateStr) => {
		if (!dateStr) return "-";
		return new Date(dateStr).toLocaleDateString("en-IN");
	};


	return (
		<div className="space-y-5">
			<h2 className="text-lg font-semibold text-gray-700">Step 4 - Review & Confirm</h2>
			
			{/* Personal Info */}
			<div className="bg-gray-50 rounded-xl p-4">
				<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Personal Info</h3>
				<Row label="Name" value={v.name} />
				<Row label="Email" value={v.email} />
				<Row label="Phone" value={v.phone} />
				<Row label="DOB" value={formatDate(v.dob)} />
				<Row label="Gender" value={v.gender} />
			</div>
			
			{/* Room Info */}
			<div className="bg-gray-50 rounded-xl p-4">
				<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Room Assignment</h3>
				<Row label="Room" value={v.roomLabel} />
				<p className="text-xs text-blue-600 mt-1">
					Bed will be auto-assigned by the system.
				</p>
			</div>

			{/* Documents */}
			<div className="bg-gray-50 rounded-xl p-4">
				<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Documents</h3>
				<Row label="ID Type" value={v.idProofType} />
				<Row label="File" value={v.idProof?.name} />
				<Row label="Emergency Contact" value={v.emergencyContactName} />
				<Row label="Contact Phone" value={v.emergencyContactPhone} />
				<Row label="Relation" value={v.emergencyContactRelation} />
			</div>

			<p className="text-xs text-gray-400">
				After submitting, a temporary password will be generated and emailed to the tenant.
			</p>

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
					onClick={onSubmit}
					disabled={isSubmitting}
					className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
				>
					{isSubmitting ? "Submitting..." : "✓ Create Tenant"}
				</button>
			</div>
		</div>
	);
}
