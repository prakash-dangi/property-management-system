import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { fetchMyRoom } from "../../api/tenantPortalApi";
import BedGrid from "../../components/BedGrid";

const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });
};

const StatCard = ({ label, value }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
        <p className="text-xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
);

export default function TenantHome() {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const result = await fetchMyRoom();
                setData(result);
            } catch {
                toast.error("Failed to load your room details");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="text-center py-16 text-gray-400">Loading your room...</div>;
    if (!data)   return null;

    const { room, bedGrid, yourBed, roommates, hostel } = data;

    return (
        <div className="space-y-6 max-w-2xl mx-auto">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">My Room</h1>
                <p className="text-sm text-gray-500 mt-0.5">{hostel?.name}</p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard label="Room No." value={`R-${room.roomNumber}`} />
                <StatCard label="Your Bed"  value={yourBed ?? "—"} />
                <StatCard label="Floor"     value={room.floor ?? "—"} />
            </div>

            {/* Room info card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Room Details
                </h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <span className="text-gray-500">Type</span>
                        <p className="font-medium capitalize text-gray-800">{room.type}</p>
                    </div>
                    <div>
                        <span className="text-gray-500">Capacity</span>
                        <p className="font-medium text-gray-800">{room.capacity} beds</p>
                    </div>
                    <div>
                        <span className="text-gray-500">Rent</span>
                        <p className="font-medium text-gray-800">
                            ₹{room.rent?.toLocaleString("en-IN") ?? "—"} / month
                        </p>
                    </div>
                </div>

                {room.amenities?.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-400 mb-2">Amenities</p>
                        <div className="flex flex-wrap gap-1.5">
                            {room.amenities.map((a, i) => (
                                <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                                    {a}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bed grid */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                    Bed Map
                </h2>
                <BedGrid bedGrid={bedGrid} interactive={false} />
            </div>

            {/* Roommates */}
            {roommates.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Roommates ({roommates.length})
                    </h2>
                    <div className="space-y-2">
                        {roommates.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold flex items-center justify-center">
                                    {r.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{r.name}</p>
                                    <p className="text-xs text-gray-400">Bed {r.bedNumber}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center text-sm text-gray-400 py-4">
                    You have no roommates yet.
                </div>
            )}

            {/* Quick links to other portal sections */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "Invoices",   path: "/portal/invoices",   icon: "💳" },
                    { label: "Complaints", path: "/portal/complaints", icon: "📋" },
                    { label: "Notices",    path: "/portal/notices",    icon: "📢" },
                ].map(({ label, path, icon }) => (
                    <a key={label} href={path}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-indigo-200 transition-colors"
                    >
                        <span className="text-xl">{icon}</span>
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                    </a>
                ))}
            </div>
        </div>
    );
}