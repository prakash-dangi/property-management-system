import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import useRoomStore from "../../store/roomStore";
import { fetchDues, fetchDuesSummary, waiveInvoice } from "../../api/paymentApi";
import RecordPaymentModal from "../../components/RecordPaymentModal";

const STATUS_STYLES = {
    overdue:        "bg-red-100 text-red-700",
    partially_paid: "bg-yellow-100 text-yellow-700",
    unpaid:         "bg-gray-100 text-gray-600",
    paid:           "bg-green-100 text-green-700",
    waived:         "bg-blue-50 text-blue-500",
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function InvoiceList() {
    const selectedHostel = useRoomStore(state => state.selectedHostel);

    const [summary, setSummary]           = useState(null);
    const [invoices, setInvoices]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [selectedInvoice, setSelected]  = useState(null); // for modal
    const [modalOpen, setModalOpen]       = useState(false);

    const load = useCallback(async () => {
        if (!selectedHostel) return;
        setLoading(true);
        try {
            const [duesData, summaryData] = await Promise.all([
                fetchDues(selectedHostel._id),
                fetchDuesSummary(selectedHostel._id)
            ]);
            setInvoices(duesData.invoices || []);
            setSummary(summaryData);
        } catch {
            toast.error("Failed to load dues");
        } finally {
            setLoading(false);
        }
    }, [selectedHostel]);

    useEffect(() => { load(); }, [load]);

    const handlePaymentSuccess = ({ invoice }) => {
        setModalOpen(false);
        // Optimistic update: remove from dues list if now paid/waived
        if (invoice.status === "paid") {
            setInvoices(prev => prev.filter(i => i._id !== invoice._id));
        } else {
            setInvoices(prev => prev.map(i => i._id === invoice._id ? invoice : i));
        }
        // Reload summary
        if (selectedHostel) {
            fetchDuesSummary(selectedHostel._id).then(setSummary).catch(() => {});
        }
        toast.success("Payment recorded");
    };

    const handleWaive = async (invoice) => {
        if (!window.confirm(`Waive invoice ${invoice.invoiceNumber}? This writes off the debt.`)) return;
        try {
            await waiveInvoice(selectedHostel._id, invoice._id);
            setInvoices(prev => prev.filter(i => i._id !== invoice._id));
            toast.success("Invoice waived");
            fetchDuesSummary(selectedHostel._id).then(setSummary).catch(() => {});
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to waive");
        }
    };

    if (!selectedHostel) {
        return <div className="text-center py-16 text-gray-400">Select a hostel first</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Dues & Payments</h1>

            {/* Summary cards */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Total Outstanding", value: `₹${summary.total.totalDue.toLocaleString("en-IN")}`, color: "text-gray-800" },
                        { label: "Overdue", value: `₹${summary.overdue.totalDue.toLocaleString("en-IN")} (${summary.overdue.count})`, color: "text-red-600" },
                        { label: "Partially Paid", value: `₹${summary.partially_paid.totalDue.toLocaleString("en-IN")} (${summary.partially_paid.count})`, color: "text-yellow-600" },
                        { label: "Unpaid", value: `₹${summary.unpaid.totalDue.toLocaleString("en-IN")} (${summary.unpaid.count})`, color: "text-gray-600" },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <p className="text-xs text-gray-400 mb-1">{label}</p>
                            <p className={`text-lg font-bold ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Dues table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="text-center py-16 text-gray-400">Loading...</div>
                ) : invoices.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-4xl mb-3">✅</p>
                        <p className="text-gray-500 font-medium">No outstanding dues</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                {["Invoice", "Tenant", "Room", "Period", "Total", "Paid", "Remaining", "Status", "Actions"].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {invoices.map(inv => {
                                const remaining = inv.totalAmount - inv.paidAmount;
                                const tenantName = inv.tenant?.user?.name || "—";
                                return (
                                    <tr key={inv._id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{inv.invoiceNumber}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800">{tenantName}</td>
                                        <td className="px-4 py-3 text-gray-500">{inv.room?.roomNumber || "—"}</td>
                                        <td className="px-4 py-3 text-gray-500">{MONTH_NAMES[inv.month - 1]} {inv.year}</td>
                                        <td className="px-4 py-3">₹{inv.totalAmount.toLocaleString("en-IN")}</td>
                                        <td className="px-4 py-3 text-green-600">₹{inv.paidAmount.toLocaleString("en-IN")}</td>
                                        <td className="px-4 py-3 font-semibold text-red-600">₹{remaining.toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[inv.status] || ""}`}>
                                                {inv.status.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setSelected(inv); setModalOpen(true); }}
                                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                                                >
                                                    Pay
                                                </button>
                                                <button
                                                    onClick={() => handleWaive(inv)}
                                                    className="px-3 py-1 border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50"
                                                >
                                                    Waive
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Payment modal */}
            <RecordPaymentModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setSelected(null); }}
                onSuccess={handlePaymentSuccess}
                invoice={selectedInvoice}
                hostelId={selectedHostel._id}
            />
        </div>
    );
}