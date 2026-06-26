// StatusBadge renders a colored pill based on room status.
// it accepts only one prop: status (string)
// Unknown statuses fall back to a neutral grey

export default function StatusBadge({ status }) {
	const statusStyles = {
		available: "bg-green-100 text-green-700",
		occupied: "bg-blue-100 text-blue-700",
		maintenance: "bg-amber-100 text-amber-700"
	};

	return (
		<span
			className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[status] || "bg-gray-100 text-gray-700"}`}
		>
			{status}
		</span>
	);
}
