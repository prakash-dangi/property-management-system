// bedGrid: array of { bedNumber, occupied, tenantName, isYours }
// interactive: bool - show "click to assign" on available beds (admin only)
// onAssign: fn(bedNumber) - called when admin clicks an available bed

export default function BedGrid({ bedGrid = [], interactive = false, onAssign }) {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
			{bedGrid.map((bed) => {
				const isAvailable = !bed.occupied;
				const isClickable = interactive && isAvailable;

				return (
					<button
						key={bed.bedNumber}
						disabled={!isClickable}
						onClick={() => isClickable && onAssign?.(bed.bedNumber)}
						className={`
							relative p-4 rounded-xl border-2 text-left transition-all
							${bed.isYours
								? "border-indigo-500 bg-indigo-50"
								: bed.occupied
									? "border-gray-200 bg-white cursor-default"
									: isClickable
										? "border-dashed border-green-400 bg-green-50 hover:bg-green-100 cursor-pointer"
										: "border-dashed border-gray-200 bg-gray-50 cursor-default"
							}
						`}
					>
						<p className="text-xs text-gray-400 font-medium mb-1">
							Bed {bed.bedNumber}
							{bed.isYours && (
								<span className="ml-2 text-indigo-600 font-semibold">· You</span>
							)}
						</p>
						<p className={`text-sm font-semibold truncate ${
							bed.occupied ? "text-gray-800" : "text-gray-400 italic"
						}`}>
							{bed.occupied ? bed.tenantName : isClickable ? "Click to assign" : "Available"}
						</p>
					</button>
				);
			})}
		</div>
	);
}