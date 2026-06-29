import api from "./axios";

// Fetch all tenants for a hostel (with optimal filters)
// filters: { search, room, status }
export const fetchTenants = async (hostelId, filters = {}) => {
	const params = new URLSearchParams();
	if (filters.search) params.append("search", filters.search);
	if (filters.room) params.append("room", filters.room);
	if (filters.status) params.append("status", filters.status);
	const query = params.toString();
	const res = await api.get(`/api/hostels/${hostelId}/tenants${query ? `?${query}` : ""}`);
	return res.data.tenants;
};

// Fetch a single tenant's full profile
export const fetchTenantById = async (hostelId, tenantId) => {
	const res = await api.get(`/api/hostels/${hostelId}/tenants/${tenantId}`);
	return res.data.tenant;
};

// Create tenant - sends multipart/form-data because of the ID proofs file
export const createTenant = async (hostelId, formData) => {
	const res = await api.post(`/api/hostels/${hostelId}/tenants`, formData, {
		headers: { "Content-Type": "multipart/form-data" }
	});
	return res.data; // returns { success, tenant, credentials }
};

// Get room availability (available beds + bed assignments)
// Used in step 2 to show which beds are free
export const fetchRoomAvailability = async (hostelId, roomId) => {
	const res = await api.get(`/api/hostels/${hostelId}/rooms/${roomId}/availability`);
	return res.data; // returns { capacity, occupied, availableBeds, bedAssignments }
};

// Fetch rooms that are NOT fully occupied - for the room picker in Step 2
// we reuse the status filter from the rooms API
export const fetchAvailableRooms = async (hostelId) => {
	const res = await api.get(`/api/hostels/${hostelId}/rooms?status=available`);
	return res.data.rooms;
};

// Get pre-checkout summary (days stayed, financials, timeline data)
// Called before the modal opens - makes the modal instant
export const fetchCheckInSummary = async (hostelId, tenantId) => {
	const res = await api.get(
		`/api/hostels/${hostelId}/tenants/${tenantId}/checkin-summary`
	);
	return res.data; // { success, tenant, summary }
};

// Execute checkout
// force=true bypass pending dues (owner privilate)
export const checkOutTenant = async (hostelId, tenantId, force = false) => {
	const res = await api.put(
		`/api/hostels/${hostelId}/tenants/${tenantId}/checkout${force ? "?force=true" : ""}`
	);
	return res.data; // { success, summary, tenant, room }
};

// Get room history (past vacated tenants)
export const fetchRoomHistory = async (hostelId, roomId) => {
	const res = await api.get(`/api/hostels/${hostelId}/rooms/${roomId}/history`);
	return res.data; // { success, const, room, history }
};