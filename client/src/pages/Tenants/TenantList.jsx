import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchTenants } from "../../api/tenantApi";
import useRoomStore from "../../store/roomStore";
import StatusBadge from "../../components/StatusBadge";

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });
};

export default function TenantList() {
    const navigate = useNavigate();
    const selectedHostel = useRoomStore(state => state.selectedHostel);

    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search,  setSearch]  = useState("");
    const [status,  setStatus]  = useState("");

    // Reload whenever filters or selected hostel changes
    useEffect(() => {
        if (!selectedHostel) return;
        const load = async () => {
            setLoading(true);
            try {
                const data = await fetchTenants(selectedHostel._id, { search, status });
                setTenants(data);
            } catch {
                toast.error("Failed to load tenants");
            } finally {
                setLoading(false);
            }
        };
        // Small debounce for the search field
        const timer = setTimeout(load, 300);
        return () => clearTimeout(timer);
    }, [selectedHostel, search, status]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Tenants</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage all tenants for the selected hostel</p>
                </div>
                <button
                    onClick={() => navigate("/dashboard/tenants/new")}
                    disabled={!selectedHostel}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    + Add Tenant
                </button>
            </div>

            {/* No hostel selected */}
            {!selectedHostel ? (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-lg">Select a hostel from the Rooms page to view tenants</p>
                </div>
            ) : (
                <>
                    {/* Filters */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="vacated">Vacated</option>
                        </select>
                        {(search || status) && (
                            <button
                                onClick={() => { setSearch(""); setStatus(""); }}
                                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Count */}
                    {!loading && (
                        <p className="text-sm text-gray-500">
                            {tenants.length} tenant{tenants.length !== 1 ? "s" : ""} found
                        </p>
                    )}

                    {/* Table */}
                    {loading ? (
                        <div className="text-center py-16 text-gray-400">Loading...</div>
                    ) : tenants.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <p className="text-lg">No tenants found</p>
                            <p className="text-sm mt-1">
                                {search || status ? "Try clearing the filters" : "Click \"+ Add Tenant\" to onboard one"}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Room</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bed</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Check-In</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rent</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {tenants.map(tenant => (
                                            <tr
                                                key={tenant._id}
                                                onClick={() => navigate(`/dashboard/tenants/${tenant._id}`)}
                                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-800">{tenant.user?.name}</div>
                                                    <div className="text-xs text-gray-400">{tenant.user?.email}</div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    Room {tenant.room?.roomNumber ?? "—"}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {tenant.bedNumber ? `Bed ${tenant.bedNumber}` : "—"}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {formatDate(tenant.joiningDate)}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {tenant.room?.rent
                                                        ? `₹${tenant.room.rent.toLocaleString("en-IN")}`
                                                        : "—"
                                                    }
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={tenant.status} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
