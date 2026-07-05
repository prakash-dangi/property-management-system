import api from "./axios";

// GET /api/portal/me
// Returns own tenant profile: user, room, hostel, check-in date, id proof
export const fetchMyProfile = async () => {
	const res = await api.get("/api/portal/me");
	return res.data.tenant; // { user, room, hostel, status, checkInDate, ... }
};

// GET /api/portal/my-room
// Returns room details + bed grid + roommate names
export const fetchMyRoom = async () => {
	const res = await api.get("/api/portal/my-room");
	return res.data; // { room, bedGrid, yourBed, roommates, hostel }
};

export const fetchMyInvoices = async () => {
    const res = await api.get("/api/portal/my-invoices");
    return res.data; // { invoices, summary }
};