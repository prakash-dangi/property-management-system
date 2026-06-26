import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import toast from "react-hot-toast";
import { fetchAvailableRooms, fetchRoomAvailability } from "../../../api/tenantApi";
import useRoomStore from "../../../store/roomStore";

// Props: onNext, onPrev
export default function RoomAssignmentStep({ onNext, onPrev }) {
	const { register, watch, setValue, trigger, formState: { errors } } = useFormContext();
	const selectedHostel = useRoomStore(state => state.selectedHostel);

	const [rooms, setRooms] = useState([]);
	const [availability, setAvailability] = useState(null); // { capacity, occupied, availableBeds }
	const [loadingRooms, setLoadingRooms] = useState(false);
	const [loadingBeds, setLoadingBeds] = useState(false);

	const watchedRoomId = watch("roomId");

	// Load available rooms on mount
	useEffect(() => {
		const load = async () => {
			if (!selectedHostel) return;
			setLoadingRooms(true);
			try {
				// Fetches rooms with status=available
				// The backend will also return partially filled rooms because
				// their status only changes to "occupied" when fully filled.
				const data = await fetchAvailableRooms(selectedHostel._id);
				setRooms(data);
			} catch {
				toast.error("Failed to load rooms");
			} finally {
				setLoadingRooms(false);
			}
		};
		load();
	}, [selectedHostel]);

	// Fetch bed availability when a room is selected
	useEffect(() => {
		if (!watchedRoomId || !selectedHostel) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setAvailability(null);
			return;
		}
		const load = async () => {
			setLoadingBeds(true);
			try {
				const data = await fetchRoomAvailability(selectedHostel._id, watchedRoomId);
				setAvailability(data);
			} catch {
				toast.error("Failed to fetch room availability");
				setAvailability(null);
			} finally {
				setLoadingBeds(false);
			}
		};
		load();
	}, [watchedRoomId, selectedHostel]);

	const handleNext = async () => {
		const valid = await trigger(["roomId"]);
		if (valid) onNext();
	};

	return (
		<div className="space-y-4">
			<h2 className="text-lg font-semibold text-gray-700">Step 2 - Room Assignment</h2>
			
			{!selectedHostel ? (
				<p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
					Please select a hostel from the Rooms page before adding a tenant.
				</p>
			) : (
				<>
					{/* Room Selector */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Select Room <span className="text-red-500">*</span>
						</label>
						{loadingRooms ? (
							<p className="text-sm text-gray-500">Loading rooms...</p>
							) : (
								<select
									{...register("roomId", { required: "Please select a room" })}
									className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									onChange={(e) => {
										const selectedId = e.target.value;
										const selectedRoom = rooms.find(r => r._id === selectedId);
										setValue("roomId", selectedId);
										setValue(
											"roomLabel",
											selectedRoom
												? `Room ${selectedRoom.roomNumber} — ${selectedRoom.type}`
												: ""
										);
									}}
								>
									<option value="">Choose a room</option>
									{rooms.map(room => (
										<option key={room._id} value={room._id}>
											Room {room.roomNumber} - {room.type} - ₹{room.rent?.toLocaleString("en-IN")}/mo
										</option>
									))}
								</select>
							)}
							{errors.roomId && <p className="text-red-500 text-xs mt-1">{errors.roomId.message}</p>}
						</div>
						
						{/* Bed Availability Preview */}
						{watchedRoomId && (
							<div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-2">
								{loadingBeds ? (
									<p className="text-sm text-gray-500">Checking availability...</p>
								) : availability ? (
									<>
										<div className="flex gap-4 text-sm">
											<span className="text-gray-600">
												Capacity: <strong>{availability.capacity}</strong>
											</span>
											<span className="text-gray-600">
												Occupied <strong>{availability.occupied}</strong>
											</span>
											<span className="text-green-700 font-medium">
												Available: {availability.capacity - availability.occupied}
											</span>
										</div>

										{availability.availableBeds.length > 0 ? (
											<div>
												<p className="text-sm text-gray-600">
													Available beds:{" "}
													<strong className="text-gray-800">
														{availability.availableBeds.join(", ")}
													</strong>
												</p>
												<p className="text-sm text-blue-700 font-medium mt-1">
													Auto-assigned Bed:{" "}
													<strong>Bed {availability.availableBeds[0]}</strong>
												</p>
											</div>
										) : (
											<p className="text-sm text-red-600 font-medium">
												This room is full. Please select another.
											</p>
										)}

										{/* Existing tenants in this room */}
										{availability.bedAssignments?.length > 0 && (
											<div className="pt-2 border-t border-blue-200">
												<p className="text-xs text-gray-500 mb-1">Current occupants:</p>
												<div className="flex flex-col gap-1">
													{availability.bedAssignments.map(b => (
														<span key={b.bedNumber} className="text-xs text-gray-700">
															Bed {b.bedNumber}: {b.tenantName}
														</span>
													))}
												</div>
											</div>
										)}
									</>
								) : null}
							</div>
						)}
				</>
			)}

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
					disabled={!selectedHostel || (availability && availability.availableBeds.length === 0)}
					className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
				>
					Next →
				</button>
			</div>
		</div>
	);
}
