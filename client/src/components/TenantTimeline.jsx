const formatDate = (d) => {
	if (!d) return "-";
	return new Date(d).toLocaleDateString("en-IN", {
		day: "2-digit", month: "short", year: "numeric"
	});
};

export default function TenantTimeline({ checkInDate, checkOutDate, expectedCheckOutDate, status }) {
	const isVacated = status === "vacated";
	const today = new Date();

	const steps = [
		{
			label: "Checked In",
			date: formatDate(checkInDate),
			done: true,
		},
		{
			label: isVacated ? "Checked Out" : "Today",
			date: isVacated ? formatDate(checkOutDate) : formatDate(today),
			done: isVacated,
			active: !isVacated
		},
		{
			label: "Expected Exit",
			date: formatDate(expectedCheckOutDate),
			done: false
		}
	];

	return (
		<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
			<h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
				Timeline
			</h3>
			<div className="relative flex flex-col gap-0">
				{steps.map((step, i) => (
					<div key={i} className="flex items-start gap-3">
						{/* Dot + vertical line */}
						<div className="flex flex-col items-center">
							<div className={`
								w-3 h-3 rounded-full mt-0.5 shrink-0
								${step.done ? "bg-green-500"
								: step.active ? "bg-blue-500 ring-2 ring-blue-200"
								: "bg-gray-200"}
							`} />
							{i < steps.length - 1 && (
								<div className="w-px flex-1 bg-gray-200 my-1 min-h-[24px]" />
							)}
						</div>

						{/* Label + Date */}
						<div className="pb-4">
							<p className={`text-sm font-medium ${step.active ? "text-blue-600" : "text-gray-700"}`}>
								{step.label}
							</p>
							<p className="text-xs text-gray-400">{step.date}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}