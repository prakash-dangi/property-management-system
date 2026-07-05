import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { fetchMyInvoices } from "../../api/tenantPortalApi";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const STATUS_STYLES = {
    paid:           "bg-green-100 text-green-700",
    unpaid:         "bg-gray-100 text-gray-600",
    overdue:        "bg-red-100 text-red-700",
    partially_paid: "bg-yellow-100 text-yellow-700",
    waived:         "bg-blue-50 text-blue-500",
};

export default function TenantInvoices() {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null); // expanded invoice _id

    useEffect(() => {
        const load = async () => {
            try {
                const result = await fetchMyInvoices();
                setData(result);
            } catch {
                toast.error("Failed to load invoices");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="text-center py-16 text-gray-400">Loading invoices...</div>;
    if (!data)   return null;

    const { invoices, summary } = data;

    return (
        <div className="max-w-2xl mx-auto space-y-6">

            <h1 className="text-2xl font-bold text-gray-800">My Invoices</h1>

            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-xl font-bold text-gray-800">₹{summary.totalInvoiced.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Total Invoiced</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-xl font-bold text-green-600">₹{summary.totalPaid.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Total Paid</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className={`text-xl font-bold ${summary.totalPending > 0 ? "text-red-600" : "text-gray-400"}`}>
                        ₹{summary.totalPending.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Pending</p>
                </div>
            </div>

            {/* Invoice list */}
            {invoices.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No invoices yet</div>
            ) : (
                <div className="space-y-3">
                    {invoices.map(inv => (
                        <div key={inv._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

                            {/* Invoice row — click to expand */}
                            <button
                                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                onClick={() => setExpanded(e => e === inv._id ? null : inv._id)}
                            >
                                <div>
                                    <p className="font-mono text-xs text-gray-400">{inv.invoiceNumber}</p>
                                    <p className="font-semibold text-gray-800 mt-0.5">
                                        {MONTH_NAMES[inv.month - 1]} {inv.year}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[inv.status] || ""}`}>
                                        {inv.status.replace("_", " ")}
                                    </span>
                                    <p className="text-sm font-bold text-gray-800 mt-1">
                                        ₹{inv.totalAmount.toLocaleString("en-IN")}
                                    </p>
                                </div>
                            </button>

                            {/* Expanded details */}
                            {expanded === inv._id && (
                                <div className="px-5 pb-4 space-y-3 border-t border-gray-100 pt-3">

                                    {/* Breakdown */}
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Rent</span>
                                            <span className="text-gray-800">₹{inv.rentAmount.toLocaleString("en-IN")}</span>
                                        </div>
                                        {inv.extraCharges?.map((e, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span className="text-gray-500">{e.label}</span>
                                                <span className="text-gray-800">₹{e.amount.toLocaleString("en-IN")}</span>
                                            </div>
                                        ))}
                                        {inv.discount > 0 && (
                                            <div className="flex justify-between text-green-600">
                                                <span>Discount</span>
                                                <span>-₹{inv.discount.toLocaleString("en-IN")}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-semibold border-t border-gray-100 pt-1">
                                            <span>Total</span>
                                            <span>₹{inv.totalAmount.toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="flex justify-between text-green-600">
                                            <span>Paid</span>
                                            <span>₹{inv.paidAmount.toLocaleString("en-IN")}</span>
                                        </div>
                                        {inv.status !== "paid" && inv.status !== "waived" && (
                                            <div className="flex justify-between text-red-600 font-semibold">
                                                <span>Remaining</span>
                                                <span>₹{(inv.totalAmount - inv.paidAmount).toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment history */}
                                    {inv.payments?.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                                Payment History
                                            </p>
                                            <div className="space-y-1">
                                                {inv.payments.map((p, i) => (
                                                    <div key={i} className="flex justify-between text-xs text-gray-600 py-1 border-b border-gray-50 last:border-0">
                                                        <span>
                                                            {new Date(p.paidAt).toLocaleDateString("en-IN")}
                                                            {" · "}
                                                            <span className="capitalize">{p.method.replace("_", " ")}</span>
                                                        </span>
                                                        <span className="font-semibold text-green-600">
                                                            ₹{p.amount.toLocaleString("en-IN")}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Notes */}
                                    {inv.notes && (
                                        <p className="text-xs text-gray-400 italic">{inv.notes}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}