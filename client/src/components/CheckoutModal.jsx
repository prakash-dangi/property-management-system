import { useState } from "react";
import toast from "react-hot-toast";
import { checkOutTenant } from "../api/tenantApi";
import useRoomStore from "../store/roomStore";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", {
	day: "2-digit", month: "short", year: "numeric"
}) : "-";

const Row = ({ label, value, highlight }) => (
	<div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
		<span className="text-sm text-gray-500">{label}</span>
		<span className={`text-sm font-semibold ${highlight ? "text-red-600" : "text-gray-800"}`}>
			{value}
		</span>
	</div>
);

// Props: 
// open			- boolean
// onClose 		- fn()
// onSuccess	- fn(result) - called after successful checkout
// tenantId 	- string
// summary 		- { tenant, summary } from fetchCheckInSummary
export default function CheckoutModal({ open, onClose, onSuccess, tenantId, summary	}) {
	const selectedHostel = useRoomStore(state => state.selectedHostel);
	const [submitting, setSubmitting] = useState(false);

	if (!open || !summary) return null;

	const { tenant, summary: stats } = summary;
	const hasDues = stats.pendingAmount > 0;

	const handleCheckout = async (force = false) => {
		if (!selectedHostel) return;
		setSubmitting(true);
		try {
			const result = await checkOutTenant(selectedHostel._id, tenantId, force);
			toast.success(`${tenant.user?.name} checked out successfully`);
			onSuccess(result);
		} catch (err) {
			toast.error(err.response?.data?.message || "Checkout failed");
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
						<h2 className="text-lg font-semibold text-gray-800">Check Out Tenant</h2>
						<p className="text-sm text-gray-500">{tenant.user?.name}</p>
					</div>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 text-xl font-bold"
					>
						✕
					</button>
				</div>

				{/* Stay summary */}
				<div className="bg-gray-50 rounded-xl p-4">
					<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
						Stay Summary
					</h3>

					<Row label="Room" value={`Room ${tenant.room?.roomNumber} - Bed ${tenant.bedNumber}`} />
					<Row label="Check-In" value={formatDate(tenant.checkInDate)} />
					<Row label="Check-Out" value={formatDate(new Date())} />
					<Row label="Days Stayed" value={`${stats.daysStayed} day${stats.daysStayed !== 1 ? "s" : ""}`} />
				</div>

				{/* Financial Summary */}
				<div className="bg-gray-50 rounded-xl p-4">
					<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
						Financials
					</h3>
					<Row label="Total Paid" value={`₹${stats.totalPaid.toLocaleString("en-IN")}`} />
					<Row
						label="Pending Dues"
						value={`₹${stats.pendingAmount.toLocaleString("en-IN")}`}
						highlight={hasDues}
					/>
					{stats.estimatedRent && (
						<Row
							label="Est. Rent (days × rate)"
							value={`₹${stats.estimatedRent.toLocaleString("en-IN")}`}
						/>
					)}
				</div>

				{/* Dues warning */}
				{hasDues && (
					<div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
						⚠️ This tenant has ₹{stats.pendingAmount.toLocaleString("en-IN")} in unpaid dues.
						Proceed only if you are writing them off.
					</div>
				)}

				{/* Actions */}
				<div className="flex gap-3">
					<button
						onClick={onClose}
						className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>

					{/* Normal checkout - blocked if dues exist */}
					{!hasDues && (
						<button
							onClick={() => handleCheckout(false)}
							disabled={submitting}
							className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
						>
							{submitting ? "Processing..." : "Confirm Checkout"}
						</button>
					)}

					{/* Force checkout - shown only when dues exist */}
					{hasDues && (
						<button
							onClick={() => handleCheckout(true)}
							disabled={submitting}
							className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
						>
							{submitting ? "Processing..." : "Force Checkout"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}