const Tenant = require("../models/Tenant");
const Room   = require("../models/Room");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");

// ── Helper ────────────────────────────────────────────────────────
// Finds the active tenant record for the currently logged-in user.
// Always used first in every tenant-portal endpoint as the security gate.
// If the user is not an active tenant, they get a 404 — not a 403,
// so we don't leak whether a record exists.

const getOwnTenant = async (userId) => {
    return Tenant.findOne({
        user: userId,
        status: "active"
    })
        .populate("user", "name email phone avatar")
        .populate("room")
        .populate("hostel", "name address");
};

// ── GET /api/portal/me ─────────────────────────────────────────────
// Returns the tenant's own profile: user info + room + hostel
// Used for: portal home, profile page

exports.getTenantProfile = async (req, res, next) => {
    try {
        const tenant = await getOwnTenant(req.user._id);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: "No active tenant record found for this account"
            });
        }

        res.json({ success: true, tenant });
    } catch (error) {
        next(error);
    }
};

// ── GET /api/portal/my-room ────────────────────────────────────────
// Returns the tenant's room details + all current roommates
// (other active tenants in the same room, with limited public info)
// Security: tenant can only see their OWN room. roommates' data is
// limited — only name and bed number, no emails or IDs.

exports.getMyRoom = async (req, res, next) => {
    try {
        const tenant = await getOwnTenant(req.user._id);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: "No active tenant record found"
            });
        }

        // Fetch all ACTIVE tenants in the same room
        const roommates = await Tenant.find({
            room: tenant.room._id,
            status: "active",
            _id: { $ne: tenant._id }
        })
            .populate("user", "name")
            .select("user bedNumber");

        // Build bed grid: for each bed 1..capacity,
        // show who's in it (or "Available")
        const room = tenant.room;
        const allOccupied = await Tenant.find({
            room: room._id,
            status: "active"
        })
            .populate("user", "name")
            .select("user bedNumber");

        const bedGrid = [];
        for (let i = 1; i <= room.capacity; i++) {
            const occupant = allOccupied.find(t => t.bedNumber === i);
            bedGrid.push({
                bedNumber: i,
                isYours: occupant?._id.toString() === tenant._id.toString(),
                occupied: !!occupant,
                tenantName: occupant?.user?.name || null
            });
        }

        res.json({
            success: true,
            room: {
                _id: room._id,
                roomNumber: room.roomNumber,
                floor: room.floor,
                type: room.type,
                capacity: room.capacity,
                amenities: room.amenities,
                rent: room.rent
            },
            bedGrid,
            yourBed: tenant.bedNumber,
            roommates: roommates.map(r => ({
                bedNumber: r.bedNumber,
                name: r.user?.name
            })),
            hostel: tenant.hostel
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/portal/my-invoices
// Tenant sees their own invoices sorted most recent first.
// Includes the payment history for each invoice so the UI can show
// "Paid ₹3000 on 5 Jun 2025" without a separate API call.
//
// Security: scoped entirely by req.user._id → own tenant record → own invoices.
// Tenant can NEVER see another tenant's invoices.

exports.getMyInvoices = async (req, res, next) => {
    try {
        const tenant = await getOwnTenant(req.user._id);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: "No active tenant record found"
            });
        }

        // Fetch all invoices for this tenant (including historical/vacated)
        const invoices = await Invoice.find({ tenant: tenant._id })
            .populate("room", "roomNumber")
            .sort({ year: -1, month: -1 });

        // Fetch all payments for this tenant in one query (not N+1)
        const payments = await Payment.find({ tenant: tenant._id })
            .populate("recordedBy", "name")
            .sort({ paidAt: -1 });

        // Group payments by invoiceId for O(1) lookup
        const paymentsByInvoice = {};
        payments.forEach(p => {
            const key = p.invoice.toString();
            if (!paymentsByInvoice[key]) paymentsByInvoice[key] = [];
            paymentsByInvoice[key].push(p);
        });

        // Enrich each invoice with its payments
        const enriched = invoices.map(inv => ({
            ...inv.toObject(),
            payments: paymentsByInvoice[inv._id.toString()] || []
        }));

        // Financial summary
        const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
        const totalPaid     = invoices.reduce((s, i) => s + i.paidAmount, 0);
        const totalPending  = enriched
            .filter(i => !["paid", "waived"].includes(i.status))
            .reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);

        res.json({
            success: true,
            count: enriched.length,
            summary: {
                totalInvoiced: Math.round(totalInvoiced * 100) / 100,
                totalPaid:     Math.round(totalPaid * 100) / 100,
                totalPending:  Math.round(totalPending * 100) / 100
            },
            invoices: enriched
        });
    } catch (error) {
        next(error);
    }
};