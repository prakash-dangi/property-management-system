import StatusBadge from "./StatusBadge";

// RoomCard is a pure display component
// onEdit(room) and onDelete(room) are callbacks from the parent

export default function RoomCard({ room, onEdit, onDelete }) {
	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
			{/* Header: room number + status */}
			<div className="flex justify-between items-start">
				<h3 className="text-lg font-semibold text-gray-800">
					Room {room.roomNumber}
				</h3>
				<StatusBadge status={room.status} />
			</div>

			{/* Details */}
			<div className="space-y-1 text-sm text-gray-600">
				<p>
					<span className="font-medium text-gray-700">
						Floor: </span>{" "}{room.floor ?? "-"}
				</p>

				<p>
					<span className="font-medium text-gray-700">
						Type:</span>{" "}{room.type ?? "-"}
				</p>

				<p>
					<span className="font-medium text-gray-700">Occupancy:</span>{" "}{room.tenants?.length ?? 0} / {room.capacity ?? "-"}
				</p>

				<p>
					<span className="font-medium text-gray-700">Rent</span>{" "}₹{room.rent?.toLocaleString("en-IN") ?? "-"}
				</p>

				{/* Amenities - only show if they exist */}
				{room.amenities?.length > 0 && (
					<p>
						<span className="font-medium text-gray-700">Amenities:</span>{" "}{room.amenities.join(", ")}
					</p>
				)}
			</div>

			<div className="flex gap-2 mt-auto">
				<button onClick={() => onEdit(room)} className="flex-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors">Edit</button>

				<button onClick={() => onDelete(room)} className="flex-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors">Delete</button>
			</div>

		</div>
	);
}
