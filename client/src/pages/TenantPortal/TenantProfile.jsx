import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { fetchMyProfile } from "../../api/tenantPortalApi";

const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });
};

const Field = ({ label, value }) => (
    <div className="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-medium text-gray-800">{value || "—"}</span>
    </div>
);

export default function TenantProfile() {
    const [tenant, setTenant]   = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchMyProfile();
                setTenant(data);
            } catch {
                toast.error("Failed to load profile");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>;
    if (!tenant)  return null;

    const { user } = tenant;

    return (
        <div className="max-w-lg mx-auto space-y-6">

            <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>

            {/* Avatar + name header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 text-2xl font-bold flex items-center justify-center">
                    {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">{user?.name}</h2>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
            </div>

            {/* Personal Info */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Personal Info
                </h3>
                <Field label="Phone"      value={user?.phone || tenant.phone} />
                <Field label="Check-In"   value={formatDate(tenant.checkInDate)} />
                <Field label="Status"     value={tenant.status} />
                <Field label="Hostel"     value={tenant.hostel?.name} />
                <Field label="Room"       value={tenant.room ? `Room ${tenant.room.roomNumber}` : null} />
                <Field label="Bed"        value={tenant.bedNumber} />
            </div>

            {/* Emergency Contact */}
            {tenant.emergencyContact?.name && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        Emergency Contact
                    </h3>
                    <Field label="Name"     value={tenant.emergencyContact.name} />
                    <Field label="Phone"    value={tenant.emergencyContact.phone} />
                    <Field label="Relation" value={tenant.emergencyContact.relation} />
                </div>
            )}

            {/* ID Proof */}
            {tenant.idProof?.url ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        ID Proof
                    </h3>
                    {tenant.idProof.url.match(/\.(jpg|jpeg|png)$/i) ? (
                        <img
                            src={tenant.idProof.url}
                            alt="ID Proof"
                            className="max-h-56 rounded-lg object-contain w-full"
                        />
                    ) : (
                        <a
                            href={tenant.idProof.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-indigo-600 underline"
                        >
                            📄 View Document
                        </a>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                        Uploaded {formatDate(tenant.idProof.uploadedAt)}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center text-sm text-gray-400">
                    No ID proof on file. Contact management to upload.
                </div>
            )}

            {/* Notes from management (read-only) */}
            {tenant.notes && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Notes from Management
                    </h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{tenant.notes}</p>
                </div>
            )}
        </div>
    );
}