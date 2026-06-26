import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { fetchMyHostels, fetchRooms, deleteRoom } from "../../api/roomApi";
import useRoomStore from "../../store/roomStore";
import RoomCard from "../../components/RoomCard";
import RoomModal from "../../components/RoomModal";

export default function RoomList() {
	
	// ── Global state: which hostel is selected ──────────────────
	const selectedHostel = useRoomStore(state => state.selectedHostel);
	const setSelectedHostel = useRoomStore(state => state.setSelectedHostel);

	// ── Local state ─────────────────────────────────────────────
	const [hostels, setHostels] = useState([]);   // dropdown options
	const [rooms, setRooms] = useState([]);   // fetched from server
	const [loading, setLoading] = useState(false);
	const [search, setSearch] = useState("");
	const [filters, setFilters] = useState({
		floor: "",
		type: "",
		status: ""
	});
	const [openModal, setOpenModal] = useState(false);
	const [selectedRoom, setSelectedRoom] = useState(null);  // null = Add, obj = Edit


	// ── Fetch hostel list on mount ──────────────────────────────
	// The user must pick a hostel before rooms can be loaded.
	useEffect(() => {
		const loadHostels = async () => {
			try {
				const data = await fetchMyHostels();
				setHostels(data);
				// Auto-select the first hostel if none is selected
				if (!selectedHostel && data.length > 0) {
					setSelectedHostel(data[0]);
				}
			} catch {
				toast.error("Failed to load hostels");
			}
		};
		loadHostels();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // runs once on mount


	// ── Fetch rooms whenever hostel or filters change ───────────
	useEffect(() => {
		if (!selectedHostel) return;  // no hostel yet, nothing to fetch
		const loadRooms = async () => {
			setLoading(true);
			try {
				const data = await fetchRooms(selectedHostel._id, filters);
				setRooms(data);
			} catch {
				toast.error("Failed to load rooms");
			} finally {
				setLoading(false);
			}
		};
		loadRooms();
	}, [selectedHostel, filters]);  // re-runs when either changes


	// ── Client-side search ──────────────────────────────────────
	const filteredRooms = rooms.filter(room =>
		room.roomNumber.toString().toLowerCase().includes(search.toLowerCase())
	);

	// ── Handlers ────────────────────────────────────────────────
	const handleHostelChange = (e) => {
		const hostel = hostels.find(h => h._id === e.target.value);
		setSelectedHostel(hostel);
		setRooms([]);   // clear old hostel's rooms immediately
		setSearch("");  // reset search
	};

	const handleFilterChange = (e) => {
		setFilters(prev => ({
			...prev,
			[e.target.name]: e.target.value
		}));
	};

	const handleAddRoom = () => {
		setSelectedRoom(null);   // null = Add mode
		setOpenModal(true);
	};

	const handleEditRoom = (room) => {
		setSelectedRoom(room);   // object = Edit mode
		setOpenModal(true);
	};

	const handleDeleteRoom = async (room) => {
		const confirmed = window.confirm(
			`Delete Room ${room.roomNumber}? This cannot be undone.`
		);

		if (!confirmed) return;
		try {
			await deleteRoom(selectedHostel._id, room._id);
			toast.success(`Room ${room.roomNumber} deleted`);

			// Refresh without filters re-triggering: just reload
			const updated = await fetchRooms(selectedHostel._id, filters);
			setRooms(updated);
		} catch (error) {
			toast.error(
				error.response?.data?.message || "Failed to delete room"
			);
		}
	};

	// Called by RoomModal after a successful save.
	// Re-fetches the room list with the current filters.
	const handleModalSuccess = async () => {
		if (!selectedHostel) return;
		const updated = await fetchRooms(selectedHostel._id, filters);
		setRooms(updated);
	};

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-gray-800">Rooms</h1>
					<p className="text-sm text-gray-500 mt-0.5">
						Manage rooms for your selected hostel
					</p>
				</div>
				<button
					onClick={handleAddRoom}
					disabled={!selectedHostel}
					className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
				>
					+ Add Room
				</button>
			</div>
			
			{/* Hostel Selector */}
			<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Select Hostel
				</label>
				{hostels.length === 0 ? (
					<p className="text-sm text-gray-500">
						No hostels found. Create a hostel first.
					</p>
				) : (
					<select
						value={selectedHostel?._id || ""}
						onChange={handleHostelChange}
						className="w-full sm:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						{hostels.map(hostel => (
							<option key={hostel._id} value={hostel._id}>
								{hostel.name}
							</option>
						))}
					</select>
				)}
			</div>
			{/* Filter + Search Bar */}
			{selectedHostel && (
				<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
					{/* Search — client side */}
					<input
						type="text"
						placeholder="Search room number..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="flex-1 min-w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					{/* Floor filter — server side */}
					<input
						type="number"
						name="floor"
						placeholder="Floor"
						value={filters.floor}
						onChange={handleFilterChange}
						min="0"
						className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					{/* Type filter — server side */}
					<select
						name="type"
						value={filters.type}
						onChange={handleFilterChange}
						className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">All Types</option>
						<option value="single">Single</option>
						<option value="double">Double</option>
						<option value="triple">Triple</option>
						<option value="dormitory">Dormitory</option>
					</select>
					{/* Status filter — server side */}
					<select
						name="status"
						value={filters.status}
						onChange={handleFilterChange}
						className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">All Statuses</option>
						<option value="available">Available</option>
						<option value="occupied">Occupied</option>
						<option value="maintenance">Maintenance</option>
					</select>

					{/* Clear filters */}
					{(filters.floor || filters.type || filters.status || search) && (
						<button
							onClick={() => {
								setFilters({ floor: "", type: "", status: "" });
								setSearch("");
							}}
							className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
						>
							Clear
						</button>
					)}
				</div>
			)}
			{/* Room Count */}
			{selectedHostel && !loading && (
				<p className="text-sm text-gray-500">
					Showing {filteredRooms.length} room{filteredRooms.length !== 1 ? "s" : ""}
					{rooms.length !== filteredRooms.length && ` (filtered from ${rooms.length})`}
				</p>
			)}

			{/* Content: loading / empty / grid */}

			{!selectedHostel ? (
				<div className="text-center py-16 text-gray-400">
					<p className="text-lg">Select a hostel to view rooms</p>
				</div>
			) : loading ? (
				<div className="text-center py-16 text-gray-400">
					<p>Loading rooms...</p>
				</div>
			) : filteredRooms.length === 0 ? (
				<div className="text-center py-16 text-gray-400">
					<p className="text-lg">No rooms found</p>
					<p className="text-sm mt-1">
						{search || filters.floor || filters.type || filters.status ? "Try clearing the filters" : "Click \"+ Add Room\" to create one"
						}
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{filteredRooms.map(room => (
						<RoomCard
							key={room._id}
							room={room}
							onEdit={handleEditRoom}
							onDelete={handleDeleteRoom}
						/>
					))}
				</div>
			)}

			{/* Modal (shared for Add and Edit) */}
			<RoomModal
				open={openModal}
				onClose={() => {
					setOpenModal(false);
					setSelectedRoom(null);
				}}
				roomData={selectedRoom}
				onSuccess={handleModalSuccess}
			/>
		</div>
	);
}

