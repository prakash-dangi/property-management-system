// Props:
//   open      - boolean
//   onClose   - fn()
//   onSuccess - fn({ payment, invoice }) — called after successful payment
//   invoice   - the invoice object to pay against
//   hostelId  - string

import { useState } from "react";
import toast from "react-hot-toast";
import { recordPayment } from "../api/paymentApi";

const METHODS = [
    { value: "cash",          label: "Cash" },
    { value: "upi",           label: "UPI" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "cheque",        label: "Cheque" },
    { value: "online",        label: "Online" },
];

export default function RecordPaymentModal({ open, onClose, onSuccess, invoice, hostelId }) {
    const [form, setForm] = useState({
        amount: "",
        method: "cash",
        transactionId: "",
        paidAt: new Date().toISOString().split("T")[0], // today
        notes: ""
    });
    const [submitting, setSubmitting] = useState(false);

    if (!open || !invoice) return null;

    const remaining = (invoice.totalAmount - invoice.paidAmount).toFixed(2);
    const needsTxId = ["upi", "bank_transfer"].includes(form.method);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const amount = parseFloat(form.amount);
        if (!amount || amount <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        if (amount > parseFloat(remaining)) {
            toast.error(`Amount cannot exceed ₹${remaining} (remaining balance)`);
            return;
        }
        if (needsTxId && !form.transactionId.trim()) {
            toast.error("Transaction ID is required for UPI/bank transfers");
            return;
        }

        setSubmitting(true);
        try {
            const result = await recordPayment(hostelId, {
                invoiceId: invoice._id,
                amount,
                method: form.method,
                transactionId: form.transactionId.trim() || undefined,
                paidAt: form.paidAt,
                notes: form.notes.trim() || undefined
            });
            toast.success(`₹${amount} recorded successfully`);
            onSuccess(result);
        } catch (err) {
            toast.error(err.response?.data?.message || "Payment failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">Record Payment</h2>
                        <p className="text-sm text-gray-500">
                            {invoice.invoiceNumber} · Remaining: ₹{remaining}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount (₹)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={remaining}
                            value={form.amount}
                            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                            placeholder={`Max ₹${remaining}`}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Method */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Method
                        </label>
                        <select
                            value={form.method}
                            onChange={e => setForm(f => ({ ...f, method: e.target.value, transactionId: "" }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {METHODS.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Transaction ID (conditional) */}
                    {needsTxId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Transaction / Reference ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.transactionId}
                                onChange={e => setForm(f => ({ ...f, transactionId: e.target.value }))}
                                placeholder="UPI ref / UTR number"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required={needsTxId}
                            />
                        </div>
                    )}

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Date
                        </label>
                        <input
                            type="date"
                            value={form.paidAt}
                            max={new Date().toISOString().split("T")[0]}
                            onChange={e => setForm(f => ({ ...f, paidAt: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes <span className="text-gray-400">(optional)</span>
                        </label>
                        <textarea
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            rows={2}
                            maxLength={500}
                            placeholder="e.g. Collected during hostel visit"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                        >
                            {submitting ? "Recording..." : "Record Payment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}