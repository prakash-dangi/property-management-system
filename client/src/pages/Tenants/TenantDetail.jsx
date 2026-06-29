import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { fetchTenantById, fetchCheckInSummary } from "../../api/tenantApi";
import useRoomStore from "../../store/roomStore";
import StatusBadge from "../../components/StatusBadge";
import TenantTimeline from "../../components/TenantTimeline";
import CheckoutModal from "../../components/CheckoutModal";

const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });
};

const StatCard = ({ label, value }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
);

export default function TenantDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const selectedHostel = useRoomStore(state => state.selectedHostel);

    const [tenant, setTenant]       = useState(null);
    const [summary, setSummary]     = useState(null);  // from fetchCheckInSummary
    const [loading, setLoading]     = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [loadingModal, setLoadingModal] = useState(false);

    // Load tenant profile
    useEffect(() => {
        if (!selectedHostel) return;
        const load = async () => {
            setLoading(true);
            try {
                const data = await fetchTenantById(selectedHostel._id, id);
                setTenant(data);
            } catch {
                toast.error("Failed to load tenant");
                navigate("/dashboard/tenants");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, selectedHostel]);

    // Prefetch summary when "Check Out" is clicked — modal opens after fetch
    const handleOpenCheckout = async () => {
        if (!selectedHostel || !tenant) return;
        setLoadingModal(true);
        try {
            const data = await fetchCheckInSummary(selectedHostel._id, id);
            setSummary(data);
            setModalOpen(true);
        } catch {
            toast.error("Failed to load checkout summary");
        } finally {
            setLoadingModal(false);
        }
    };

    const handleCheckoutSuccess = (result) => {
        setModalOpen(false);
        // Refresh tenant data to reflect new status
        setTenant(result.tenant);
        toast.success("Tenant checked out");
    };

    if (!selectedHostel) {
        return (
            <div className="text-center py-16 text-gray-400">
                <p>Select a hostel to view tenant details</p>
            </div>
        );
    }

    if (loading) {
        return <div className="text-center py-16 text-gray-400">Loading...</div>;
    }

    if (!tenant) return null;

    const isActive = tenant.status === "active";
    const daysStayed = tenant.checkInDate
        ? Math.ceil(
            ((tenant.checkOutDate || new Date()) - new Date(tenant.checkInDate))
            / (1000 * 60 * 60 * 24)
          )
        : 0;

    return (
        <div className="space-y-6 max-w-3xl mx-auto">

            {/* Back */}
            <button
                onClick={() => navigate("/dashboard/tenants")}
                className="text-sm text-blue-600 hover:underline"
            >
                ← Back to Tenants
            </button>

            {/* Header card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-gray-800">{tenant.user?.name}</h1>
                        <StatusBadge status={tenant.status} />
                    </div>
                    <p className="text-sm text-gray-500">{tenant.user?.email}</p>
                    <p className="text-sm text-gray-500">{tenant.user?.phone || tenant.phone}</p>
                </div>

                {isActive && (
                    <button
                        onClick={handleOpenCheckout}
                        disabled={loadingModal}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {loadingModal ? "Loading..." : "Check Out"}
                    </button>
                )}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Room" value={`R-${tenant.room?.roomNumber}`} />
                <StatCard label="Bed" value={tenant.bedNumber ?? "—"} />
                <StatCard label="Days Stayed" value={daysStayed} />
                <StatCard label="Rent / mo" value={tenant.room?.rent ? `₹${tenant.room.rent.toLocaleString("en-IN")}` : "—"} />
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                {/* Timeline */}
                <TenantTimeline
                    checkInDate={tenant.checkInDate}
                    checkOutDate={tenant.checkOutDate}
                    expectedCheckOutDate={tenant.expectedCheckOutDate}
                    status={tenant.status}
                />

                {/* Profile details */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        Details
                    </h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Check-In</span>
                            <span className="text-gray-800 font-medium">{formatDate(tenant.checkInDate)}</span>
                        </div>
                        {tenant.checkOutDate && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Check-Out</span>
                                <span className="text-gray-800 font-medium">{formatDate(tenant.checkOutDate)}</span>
                            </div>
                        )}
                        {tenant.expectedCheckOutDate && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Expected Exit</span>
                                <span className="text-gray-800 font-medium">{formatDate(tenant.expectedCheckOutDate)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-500">Room Type</span>
                            <span className="text-gray-800 font-medium capitalize">{tenant.room?.type}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Floor</span>
                            <span className="text-gray-800 font-medium">{tenant.room?.floor ?? "—"}</span>
                        </div>
                    </div>

                    {/* Emergency contact */}
                    {tenant.emergencyContact?.name && (
                        <div className="pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-1">Emergency Contact</p>
                            <p className="text-sm text-gray-700 font-medium">{tenant.emergencyContact.name}</p>
                            <p className="text-xs text-gray-500">
                                {tenant.emergencyContact.phone}
                                {tenant.emergencyContact.relation && ` · ${tenant.emergencyContact.relation}`}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ID proof */}
            {tenant.idProof?.url && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        ID Proof
                    </h3>
                    {tenant.idProof.url.match(/\.(jpg|jpeg|png)$/i) ? (
                        <img
                            src={tenant.idProof.url}
                            alt="ID Proof"
                            className="max-h-48 rounded-lg object-contain"
                        />
                    ) : (
                        <a
                            href={tenant.idProof.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 underline"
                        >
                            📄 View Document
                        </a>
                    )}
                </div>
            )}

            {/* Notes */}
            {tenant.notes && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{tenant.notes}</p>
                </div>
            )}

            {/* Checkout modal */}
            <CheckoutModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={handleCheckoutSuccess}
                tenantId={id}
                summary={summary}
            />
        </div>
    );
}