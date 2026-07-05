import api from "./axios";

// Record a manual payment
// body: { invoiceId, amount, method, transactionId?, paidAt?, notes? }
export const recordPayment = async (hostelId, body) => {
    const res = await api.post(`/api/hostels/${hostelId}/payments`, body);
    return res.data; // { payment, invoice }
};

// All payments for a hostel
// filters: { tenant, method, from, to, page, limit }
export const fetchPayments = async (hostelId, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== "") params.append(k, v);
    });
    const query = params.toString();
    const res = await api.get(
        `/api/hostels/${hostelId}/payments${query ? `?${query}` : ""}`
    );
    return res.data;
};

// Payment history for a specific tenant
export const fetchTenantPaymentHistory = async (hostelId, tenantId) => {
    const res = await api.get(
        `/api/hostels/${hostelId}/payments/tenant/${tenantId}`
    );
    return res.data; // { tenant, payments, totalPaid }
};

// Dues summary for dashboard widget
export const fetchDuesSummary = async (hostelId) => {
    const res = await api.get(
        `/api/hostels/${hostelId}/invoices/dues/summary`
    );
    return res.data.summary; // { overdue, partially_paid, unpaid, total }
};

// Full dues list (paginated)
export const fetchDues = async (hostelId, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== "") params.append(k, v);
    });
    const query = params.toString();
    const res = await api.get(
        `/api/hostels/${hostelId}/invoices/dues${query ? `?${query}` : ""}`
    );
    return res.data;
};

// Waive an invoice
export const waiveInvoice = async (hostelId, invoiceId, reason = "") => {
    const res = await api.put(
        `/api/hostels/${hostelId}/invoices/${invoiceId}/waive`,
        { reason }
    );
    return res.data.invoice;
};

// Void a payment (e.g. cheque bounced, UPI reversed by bank)
// reason is required — it's written to the payment audit trail
// The payment record is soft-deleted (voided flag), never hard-deleted.
export const voidPayment = async (hostelId, paymentId, reason) => {
    const res = await api.delete(
        `/api/hostels/${hostelId}/payments/${paymentId}`,
        { data: { reason } }  // axios: pass body with DELETE via { data: ... }
    );
    return res.data; // { payment, invoice }
};