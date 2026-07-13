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

// Creates a Razorpay order and returns credentials for Checkout
// body: { invoiceId, amount } — amount in rupees
export const createRazorpayOrder = async (invoiceId, amount) => {
    const res = await api.post("/api/portal/razorpay/create-order", {
        invoiceId,
        amount
    });
    return res.data; // { orderId, amount, currency, key, ... }
};

// Polls to confirm server-side payment processing after Checkout success
export const getRazorpayOrderStatus = async (razorpayOrderId) => {
    const res = await api.get(
        `/api/portal/razorpay/order-status/${razorpayOrderId}`
    );
    return res.data; // { status, invoice, payment }
};