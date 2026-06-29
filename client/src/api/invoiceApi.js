import api from "./axios";

// ── Generate invoices for a month ──────────────────────────────────────
// body: { month, year, dueDay?, extraCharges? }
export const generateInvoices = async (hostelId, body) => {
    const res = await api.post(
        `/api/hostels/${hostelId}/invoices/generate`,
        body
    );
    return res.data; // { generated, skipped, invoices }
};

// ── Create a single invoice manually ───────────────────────────────────
export const createInvoice = async (hostelId, data) => {
    const res = await api.post(`/api/hostels/${hostelId}/invoices`, data);
    return res.data.invoice;
};

// ── List invoices ───────────────────────────────────────────────────────
// filters: { month, year, status, tenant, page, limit }
export const fetchInvoices = async (hostelId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.month) params.append("month", filters.month);
    if (filters.year) params.append("year", filters.year);
    if (filters.status) params.append("status", filters.status);
    if (filters.tenant) params.append("tenant", filters.tenant);
    if (filters.page) params.append("page", filters.page);
    if (filters.limit) params.append("limit", filters.limit);
    const query = params.toString();
    const res = await api.get(
        `/api/hostels/${hostelId}/invoices${query ? `?${query}` : ""}`
    );
    return res.data; // { invoices, total, page, pages }
};

// ── Single invoice ──────────────────────────────────────────────────────
export const fetchInvoiceById = async (hostelId, invoiceId) => {
    const res = await api.get(`/api/hostels/${hostelId}/invoices/${invoiceId}`);
    return res.data.invoice;
};

// ── Update invoice ──────────────────────────────────────────────────────
// data: { extraCharges?, discount?, notes?, status?, paidAmount? }
export const updateInvoice = async (hostelId, invoiceId, data) => {
    const res = await api.put(
        `/api/hostels/${hostelId}/invoices/${invoiceId}`,
        data
    );
    return res.data.invoice;
};

// ── Mark overdue ────────────────────────────────────────────────────────
export const markOverdueInvoices = async (hostelId) => {
    const res = await api.post(
        `/api/hostels/${hostelId}/invoices/mark-overdue`
    );
    return res.data; // { markedOverdue: N }
};