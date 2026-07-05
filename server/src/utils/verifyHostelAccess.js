const Hostel = require("../models/Hostel");
const AppError = require("./AppError");

/**
 * Verifies the requesting user has access to this hostel.
 *
 * Owner  → must be hostel.owner
 * Staff  → must be in hostel.staff array
 * Tenant → never reaches this function (portal routes handle them separately)
 *
 * Returns the hostel document if access is granted.
 * Throws AppError 404 if not found or access denied.
 * (404 not 403 — we don't reveal whether the hostel exists at all)
 */
const verifyHostelAccess = async (hostelId, user) => {
    const hostel = await Hostel.findById(hostelId);

    if (!hostel) {
        throw new AppError("Hostel not found or access denied", 404);
    }

    const isOwner = hostel.owner.toString() === user._id.toString();
    const isStaff = hostel.staff.some(
        staffId => staffId.toString() === user._id.toString()
    );

    if (!isOwner && !isStaff) {
        throw new AppError("Hostel not found or access denied", 404);
    }

    // Attach role context — useful for owner-only guards inside controllers
    // e.g. "only owner can waive invoice" — controller checks user.role directly
    return hostel;
};

module.exports = verifyHostelAccess;