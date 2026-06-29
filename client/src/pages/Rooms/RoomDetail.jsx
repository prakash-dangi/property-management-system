import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import useRoomStore from "../../store/roomStore";
import BedGrid from "../../components/BedGrid";
import { fetchRoomHistory } from "../../api/tenantApi";

// These come from the existing roomApi.js
import { fetchRoomAvailability } from "../../api/roomApi";

const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });
};

const TABS = ["Bed Grid", "History"];

export default function RoomDetail() {
    const { id }          = useParams();
    const navigate        = useNavigate();
    const selectedHostel  = useRoomStore(state => state.selectedHostel);

    const [tab,          setTab]         = useState("Bed Grid");
    const [avail,        setAvail]       = useState(null);
    const [history,      setHistory]     = useState([]);
    const [loading,      setLoading]     = useState(true);
    const [loadingHist,  setLoadingHist] = useState(false);
    const [histLoaded,   setHistLoaded]  = useState(false);

    // Load bed availability on mount
    useEffect(() => {
        if (!selectedHostel) return;
        const load = async () => {
            setLoading(true);
            try {
                const data = await fetchRoomAvailability(selectedHostel._id, id);
                setAvail(data);
            } catch {
                toast.error("Failed to load room details");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, selectedHostel]);

    // Load history only when that tab is first clicked
    const loadHistory = async () => {
        if (!selectedHostel || histLoaded) return;
        setLoadingHist(true);
        try {
            const data = await fetchRoomHistory(selectedHostel._id, id);
            setHistory(data.history || []);
            setHistLoaded(true);
        } catch {
            toast.error("Failed to load room history");
        } finally {
            setLoadingHist(false);
        }
    };

    const handleTabChange = (t) => {
        setTab(t);
        if (t === "History") loadHistory();
    };

    // Build bed grid from availability data
    const buildBedGrid = () => {
        if (!avail) return [];
        const grid = [];
        for (let i = 1; i <= avail.capacity; i++) {
            const assignment = avail.bedAssignments?.find(b => b.bedNumber === i);
            grid.push({
                bedNumber: i,
                occupied:  !!assignment,
                tenantName: assignment?.tenantName || null,
                isYours:   false  // admin view has no "yours"
            });
        }
        return grid;
    };

    // Navigate to add tenant with roomId pre-filled
    const handleAssignBed = () => {
        navigate(`/dashboard/tenants/new?roomId=${id}`);
    };

    if (!selectedHostel) {
        return (
            <div className="text-center py-16 text-gray-400">
                Select a hostel first
            </div>
        );
    }

    if (loading) return <div className="text-center py-16 text-gray-400">Loading room...</div>;
    if (!avail)  return null;

    const bedGrid = buildBedGrid();

    return (
        <div className="space-y-6 max-w-3xl mx-auto">

            {/* Back */}
            <button
                onClick={() => navigate("/dashboard/rooms")}
                className="text-sm text-blue-600 hover:underline"
            >
                ← Back to Rooms
            </button>

            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            Room {avail.roomNumber}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {avail.occupied} / {avail.capacity} beds occupied
                        </p>
                    </div>

                    {/* Link to add a tenant to this room */}
                    <Link
                        to={`/dashboard/tenants/new?roomId=${id}`}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        + Add Tenant
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {TABS.map(t => (
                    <button
                        key={t}
                        onClick={() => handleTabChange(t)}
                        className={`
                            px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                            ${tab === t
                                ? "bg-white shadow text-gray-800"
                                : "text-gray-500 hover:text-gray-700"
                            }
                        `}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Bed Grid Tab */}
            {tab === "Bed Grid" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                        Bed Layout
                    </h2>
                    <BedGrid
                        bedGrid={bedGrid}
                        interactive={true}
                        onAssign={handleAssignBed}
                    />
                    {avail.occupied === avail.capacity && (
                        <p className="text-sm text-gray-400 text-center mt-4">
                            Room is fully occupied
                        </p>
                    )}
                </div>
            )}

            {/* History Tab */}
            {tab === "History" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                        Past Tenants
                    </h2>

                    {loadingHist ? (
                        <p className="text-center text-sm text-gray-400 py-8">Loading history...</p>
                    ) : history.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">
                            No past tenants for this room yet
                        </p>
                    ) : (
                        <div className="space-y-0">
                            {history.map((record, i) => (
                                <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                                    <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 text-sm font-semibold flex items-center justify-center shrink-0">
                                        {record.user?.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">
                                            {record.user?.name}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Bed {record.bedNumber}
                                            {" · "}
                                            {formatDate(record.checkInDate)} — {formatDate(record.checkOutDate)}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-semibold text-gray-700">
                                            {record.daysStayed ?? "—"}d
                                        </p>
                                        <p className="text-xs text-gray-400">stayed</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}