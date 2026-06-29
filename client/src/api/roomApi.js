import api from "./axios";

// Every function takes hostelId as its first argument.
// This matches the backend URL pattern.
// /api/hostels/:hostelId/rooms

// --- Fetch all rooms for a hostel (with optional filters) ---
// filters is an objecr: { floor, type, status }
// Only non-empty values are added to the query string.
export const fetchRooms = async (hostelId, filters = {}) => {
	const params = new URLSearchParams();

	if (filters.floor) params.append("floor", filters.floor);
	if (filters.type) params.append("type", filters.type);
	if (filters.status) params.append("status", filters.status);

	const query = params.toString();

	const res = await api.get(`/api/hostels/${hostelId}/rooms${query ? `?${query}` : ""}`);

	return res.data.rooms;
};

// --- Fetch room stats for a hostel ---
export const fetchRoomStats = async (hostelId) => {
	const res = await api.get(`/api/hostels/${hostelId}/rooms/stats`);
	return res.data;
};

// --- Fetch room availability ---
export const fetchRoomAvailability = async (hostelId, roomId) => {
    const res = await api.get(`/api/hostels/${hostelId}/rooms/${roomId}/availability`);
    return res.data; // { capacity, occupied, availableBeds, bedAssignments }
};

// --- Create a new room ---
export const createRoom = async (hostelId, data) => {
	const res = await api.post(`/api/hostels/${hostelId}/rooms`, data);
	return res.data.room;
};

// --- Update an existing room ---
export const updateRoom = async (hostelId, roomId, data) => {
	const res = await api.put(`/api/hostels/${hostelId}/rooms/${roomId}`, data);
	return res.data.room;
};

// --- Delete a room ---
export const deleteRoom = async (hostelId, roomId) => {
	await api.delete(`/api/hostels/${hostelId}/rooms/${roomId}`);
};

// --- Fetch all hostels owned by the current user ---
// Used by RoomList to populate the hostel selector dropdown.
export const fetchMyHostels = async () => {
	const res = await api.get("/api/hostels");
	return res.data.hostels;
};