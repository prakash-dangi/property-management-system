/**
 * seed.js — Trial database for property-management-system
 *
 * Run from the server/ directory:
 *   node seed.js
 *
 * What it creates:
 *   - 1 owner + 1 staff + 10 tenant users
 *   - 2 hostels (Sunrise Boys Hostel, Green Valley Girls PG)
 *   - 8 rooms across 2 hostels
 *   - 10 active tenants with bed assignments
 *   - 30 invoices (May + Jun + Jul 2025) with varied statuses
 *   - Payment records for all paid/partial invoices
 *   - 5 complaints, 3 expense records
 *
 * All login credentials are printed at the end.
 */

require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const User      = require("./src/models/User");
const Hostel    = require("./src/models/Hostel");
const Room      = require("./src/models/Room");
const Tenant    = require("./src/models/Tenant");
const Invoice   = require("./src/models/Invoice");
const Payment   = require("./src/models/Payment");
const Complaint = require("./src/models/Complaint");
const Expense   = require("./src/models/Expense");

const hash = (pw) => bcrypt.hash(pw, 10);
const pad  = (n)  => String(n).padStart(3, "0");

const checkIn = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d;
};

async function seed() {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "property_management" });
    console.log("\n✅  Connected to MongoDB Atlas\n");

    // ── 1. Clear all existing data ──────────────────────────────────────
    console.log("🗑️   Clearing existing data...");
    await Promise.all([
        User.deleteMany({}),
        Hostel.deleteMany({}),
        Room.deleteMany({}),
        Tenant.deleteMany({}),
        Invoice.deleteMany({}),
        Payment.deleteMany({}),
        Complaint.deleteMany({}),
        Expense.deleteMany({})
    ]);
    console.log("    Done.\n");

    // ── 2. Create Users ──────────────────────────────────────────────────
    console.log("👤  Creating users...");
    const OWNER_PW  = "owner@123";
    const STAFF_PW  = "staff@123";
    const TENANT_PW = "tenant@123";

    const [ownerHash, staffHash, tenantHash] = await Promise.all([
        hash(OWNER_PW), hash(STAFF_PW), hash(TENANT_PW)
    ]);

    const owner = await User.create({
        name: "Prakash Sharma", email: "owner@hostel.com",
        password: ownerHash, role: "owner", phone: "9876543210"
    });

    const staff = await User.create({
        name: "Ravi Kumar", email: "staff@hostel.com",
        password: staffHash, role: "staff", phone: "9812345678"
    });

    const tenantData = [
        { name: "Aarav Singh",    email: "aarav@tenant.com",   phone: "9000000001" },
        { name: "Meera Nair",     email: "meera@tenant.com",   phone: "9000000002" },
        { name: "Karan Mehta",    email: "karan@tenant.com",   phone: "9000000003" },
        { name: "Pooja Verma",    email: "pooja@tenant.com",   phone: "9000000004" },
        { name: "Rohit Gupta",    email: "rohit@tenant.com",   phone: "9000000005" },
        { name: "Sneha Pillai",   email: "sneha@tenant.com",   phone: "9000000006" },
        { name: "Arjun Reddy",    email: "arjun@tenant.com",   phone: "9000000007" },
        { name: "Divya Patel",    email: "divya@tenant.com",   phone: "9000000008" },
        { name: "Nikhil Joshi",   email: "nikhil@tenant.com",  phone: "9000000009" },
        { name: "Priya Banerjee", email: "priya@tenant.com",   phone: "9000000010" }
    ];

    const tenantUsers = await Promise.all(
        tenantData.map(t => User.create({
            ...t, password: tenantHash, role: "tenant", mustChangePassword: true
        }))
    );
    console.log(`    Created 1 owner + 1 staff + ${tenantUsers.length} tenants\n`);

    // ── 3. Create Hostels ────────────────────────────────────────────────
    console.log("🏠  Creating hostels...");

    const hostel1 = await Hostel.create({
        name: "Sunrise Boys Hostel",
        address: "42, MG Road, Bengaluru - 560001",
        owner: owner._id, phone: "9800001111",
        email: "sunrise@hostel.com", staff: [staff._id],
        subscriptionPlan: "pro", isActive: true
    });

    const hostel2 = await Hostel.create({
        name: "Green Valley Girls PG",
        address: "15, Koramangala, Bengaluru - 560034",
        owner: owner._id, phone: "9800002222",
        email: "greenvalley@hostel.com", staff: [staff._id],
        subscriptionPlan: "basic", isActive: true
    });

    console.log(`    "${hostel1.name}" and "${hostel2.name}"\n`);

    // ── 4. Create Rooms ──────────────────────────────────────────────────
    console.log("🛏️   Creating rooms...");

    const [r101, r102, r103, r201, r202] = await Promise.all([
        Room.create({ hostel: hostel1._id, roomNumber: "101", floor: 1, type: "single",    capacity: 1, rent: 8000, status: "occupied",  amenities: ["AC", "WiFi"] }),
        Room.create({ hostel: hostel1._id, roomNumber: "102", floor: 1, type: "double",    capacity: 2, rent: 6000, status: "occupied",  amenities: ["WiFi", "Fan"] }),
        Room.create({ hostel: hostel1._id, roomNumber: "103", floor: 1, type: "triple",    capacity: 3, rent: 5000, status: "occupied",  amenities: ["WiFi"] }),
        Room.create({ hostel: hostel1._id, roomNumber: "201", floor: 2, type: "double",    capacity: 2, rent: 6500, status: "available", amenities: ["AC", "WiFi"] }),
        Room.create({ hostel: hostel1._id, roomNumber: "202", floor: 2, type: "dormitory", capacity: 6, rent: 3500, status: "occupied",  amenities: ["Fan", "Locker"] })
    ]);

    const [rA1, rA2, rA3] = await Promise.all([
        Room.create({ hostel: hostel2._id, roomNumber: "A-01", floor: 1, type: "single", capacity: 1, rent: 9000, status: "occupied",  amenities: ["AC", "WiFi", "Attached Bathroom"] }),
        Room.create({ hostel: hostel2._id, roomNumber: "A-02", floor: 1, type: "double", capacity: 2, rent: 7000, status: "occupied",  amenities: ["AC", "WiFi"] }),
        Room.create({ hostel: hostel2._id, roomNumber: "A-03", floor: 1, type: "triple", capacity: 3, rent: 5500, status: "available", amenities: ["WiFi", "Fan"] })
    ]);

    console.log("    8 rooms created\n");

    // ── 5. Create Tenants ────────────────────────────────────────────────
    console.log("🧑  Creating tenant records...");

    const [
        tAarav, tMeera, tKaran, tPooja, tRohit,
        tSneha, tArjun, tDivya, tNikhil, tPriya
    ] = await Promise.all([
        Tenant.create({ user: tenantUsers[0]._id, hostel: hostel1._id, room: r101._id, bedNumber: 1, phone: "9000000001", checkInDate: checkIn(180), status: "active" }),
        Tenant.create({ user: tenantUsers[1]._id, hostel: hostel1._id, room: r102._id, bedNumber: 1, phone: "9000000002", checkInDate: checkIn(150), status: "active" }),
        Tenant.create({ user: tenantUsers[2]._id, hostel: hostel1._id, room: r102._id, bedNumber: 2, phone: "9000000003", checkInDate: checkIn(90),  status: "active" }),
        Tenant.create({ user: tenantUsers[3]._id, hostel: hostel1._id, room: r103._id, bedNumber: 1, phone: "9000000004", checkInDate: checkIn(120), status: "active" }),
        Tenant.create({ user: tenantUsers[4]._id, hostel: hostel1._id, room: r103._id, bedNumber: 2, phone: "9000000005", checkInDate: checkIn(60),  status: "active" }),
        Tenant.create({ user: tenantUsers[5]._id, hostel: hostel1._id, room: r103._id, bedNumber: 3, phone: "9000000006", checkInDate: checkIn(45),  status: "active" }),
        Tenant.create({ user: tenantUsers[6]._id, hostel: hostel1._id, room: r202._id, bedNumber: 1, phone: "9000000007", checkInDate: checkIn(200), status: "active" }),
        Tenant.create({ user: tenantUsers[7]._id, hostel: hostel1._id, room: r202._id, bedNumber: 2, phone: "9000000008", checkInDate: checkIn(30),  status: "active" }),
        Tenant.create({ user: tenantUsers[8]._id, hostel: hostel2._id, room: rA1._id,  bedNumber: 1, phone: "9000000009", checkInDate: checkIn(100), status: "active" }),
        Tenant.create({ user: tenantUsers[9]._id, hostel: hostel2._id, room: rA2._id,  bedNumber: 1, phone: "9000000010", checkInDate: checkIn(75),  status: "active" })
    ]);

    // Link tenants into rooms
    await Promise.all([
        Room.findByIdAndUpdate(r101._id, { $push: { tenants: tAarav._id } }),
        Room.findByIdAndUpdate(r102._id, { $push: { tenants: { $each: [tMeera._id, tKaran._id] } } }),
        Room.findByIdAndUpdate(r103._id, { $push: { tenants: { $each: [tPooja._id, tRohit._id, tSneha._id] } } }),
        Room.findByIdAndUpdate(r202._id, { $push: { tenants: { $each: [tArjun._id, tDivya._id] } } }),
        Room.findByIdAndUpdate(rA1._id,  { $push: { tenants: tNikhil._id } }),
        Room.findByIdAndUpdate(rA2._id,  { $push: { tenants: tPriya._id } })
    ]);

    console.log("    10 active tenants created\n");

    // ── 6. Build invoice list ────────────────────────────────────────────
    console.log("🧾  Creating invoices...");

    const allT = [
        { tenant: tAarav,  room: r101, hostel: hostel1 },
        { tenant: tMeera,  room: r102, hostel: hostel1 },
        { tenant: tKaran,  room: r102, hostel: hostel1 },
        { tenant: tPooja,  room: r103, hostel: hostel1 },
        { tenant: tRohit,  room: r103, hostel: hostel1 },
        { tenant: tSneha,  room: r103, hostel: hostel1 },
        { tenant: tArjun,  room: r202, hostel: hostel1 },
        { tenant: tDivya,  room: r202, hostel: hostel1 },
        { tenant: tNikhil, room: rA1,  hostel: hostel2 },
        { tenant: tPriya,  room: rA2,  hostel: hostel2 }
    ];

    let seq = 1;
    const invoiceDocs = [];

    const makeInvoice = ({ tenant, room, hostel }, month, year, ovr = {}) => {
        const rentAmount   = room.rent;
        const extraCharges = ovr.extraCharges || [];
        const discount     = ovr.discount || 0;
        const extras       = extraCharges.reduce((s, e) => s + e.amount, 0);
        const totalAmount  = Math.max(0, rentAmount + extras - discount);
        const paidAmount   = ovr.paidAmount ?? 0;
        const dueDate      = new Date(year, month - 1, 5);

        let status = ovr.status;
        if (!status) {
            if (paidAmount >= totalAmount)       status = "paid";
            else if (paidAmount > 0)             status = new Date() > dueDate ? "overdue" : "partially_paid";
            else                                 status = new Date() > dueDate ? "overdue" : "unpaid";
        }

        return {
            invoiceNumber: `INV-${year}-${pad(seq++)}`,
            tenant: tenant._id, hostel: hostel._id, room: room._id,
            month, year, rentAmount, extraCharges, discount,
            totalAmount, dueDate, paidAmount, status, createdBy: owner._id
        };
    };

    // May 2025 — all paid
    for (const t of allT) {
        invoiceDocs.push(makeInvoice(t, 5, 2025, { paidAmount: t.room.rent }));
    }

    // June 2025 — mixed
    const junOvr = [
        { extraCharges: [{ label: "Electricity", amount: 450 }], paidAmount: 8450 },
        { paidAmount: 6000 },
        { paidAmount: 3000 },
        { discount: 500, paidAmount: 4500 },
        { paidAmount: 0, status: "overdue" },
        { paidAmount: 5000 },
        { paidAmount: 3500 },
        { paidAmount: 2000 },
        { extraCharges: [{ label: "Water", amount: 200 }], paidAmount: 9200 },
        { paidAmount: 0, status: "overdue" }
    ];
    for (let i = 0; i < allT.length; i++) {
        invoiceDocs.push(makeInvoice(allT[i], 6, 2025, junOvr[i]));
    }

    // July 2025 — current month, mostly overdue/unpaid
    const julOvr = [
        { paidAmount: 8000, status: "paid" },
        { paidAmount: 3000, status: "partially_paid" },
        { paidAmount: 0,    status: "overdue" },
        { paidAmount: 0,    status: "overdue" },
        { paidAmount: 0,    status: "unpaid"  },
        { paidAmount: 0,    status: "unpaid"  },
        { paidAmount: 3500, status: "paid"    },
        { paidAmount: 0,    status: "overdue" },
        { paidAmount: 9000, status: "paid"    },
        { paidAmount: 0,    status: "overdue" }
    ];
    for (let i = 0; i < allT.length; i++) {
        invoiceDocs.push(makeInvoice(allT[i], 7, 2025, julOvr[i]));
    }

    const createdInvoices = await Invoice.insertMany(invoiceDocs);
    console.log(`    ${createdInvoices.length} invoices created (30: May + Jun + Jul 2025)\n`);

    // ── 7. Create Payments ───────────────────────────────────────────────
    console.log("💳  Creating payments...");

    // Helper: index 0-29 → createdInvoices[monthOffset*10 + tenantIdx]
    const inv = (mo, ti) => createdInvoices[mo * 10 + ti];

    const payDocs = [];

    // May — all 10, cash on 3 May
    // Note: cash payments do NOT include transactionId at all (omit, don't set null)
    // The sparse unique index on { hostel, transactionId } excludes MISSING fields,
    // but treats explicit `null` as a real value — which would cause a duplicate key
    // error for multiple cash payments from the same hostel.
    for (let i = 0; i < 10; i++) {
        const v = inv(0, i);
        payDocs.push({
            invoice: v._id, tenant: v.tenant, hostel: v.hostel,
            amount: v.totalAmount, method: "cash",
            paidAt: new Date(2025, 4, 3), recordedBy: staff._id,
            notes: "May rent collected at counter"
            // transactionId intentionally omitted for cash
        });
    }

    // Jun
    const junPay = [
        { ti: 0, amount: (inv(1,0)).totalAmount, method: "upi",           transactionId: "UPI-JUN-AARAV-001",  paidAt: new Date(2025,5,2), by: owner._id },
        { ti: 1, amount: (inv(1,1)).totalAmount, method: "cash",          paidAt: new Date(2025,5,1), by: staff._id },
        { ti: 2, amount: 3000,                   method: "bank_transfer", transactionId: "UTR-JUN-KARAN-001",  paidAt: new Date(2025,5,4), by: staff._id, notes: "Partial - rest next month" },
        { ti: 3, amount: (inv(1,3)).totalAmount, method: "cash",          paidAt: new Date(2025,5,5), by: staff._id, notes: "Discount for early pay" },
        { ti: 5, amount: (inv(1,5)).totalAmount, method: "online",        transactionId: "ONL-JUN-SNEHA-001",  paidAt: new Date(2025,5,3), by: owner._id },
        { ti: 6, amount: (inv(1,6)).totalAmount, method: "cash",          paidAt: new Date(2025,5,2), by: staff._id },
        { ti: 7, amount: 2000,                   method: "cash",          paidAt: new Date(2025,5,6), by: staff._id, notes: "Partial payment accepted" },
        { ti: 8, amount: (inv(1,8)).totalAmount, method: "upi",           transactionId: "UPI-JUN-NIKHIL-001", paidAt: new Date(2025,5,1), by: owner._id }
    ];
    for (const p of junPay) {
        const v = inv(1, p.ti);
        const doc = {
            invoice: v._id, tenant: v.tenant, hostel: v.hostel,
            amount: p.amount, method: p.method,
            paidAt: p.paidAt, recordedBy: p.by,
            ...(p.notes ? { notes: p.notes } : {})
        };
        // Only include transactionId when it's actually set (omit for cash)
        if (p.transactionId) doc.transactionId = p.transactionId;
        payDocs.push(doc);
    }

    // Jul
    const julPay = [
        { ti: 0, amount: (inv(2,0)).totalAmount, method: "upi",           transactionId: "UPI-JUL-AARAV-001",  paidAt: new Date(2025,6,3), by: owner._id },
        { ti: 1, amount: 3000,                   method: "cash",          paidAt: new Date(2025,6,4), by: staff._id, notes: "Remaining 3000 promised this week" },
        { ti: 6, amount: (inv(2,6)).totalAmount, method: "cash",          paidAt: new Date(2025,6,2), by: staff._id },
        { ti: 8, amount: (inv(2,8)).totalAmount, method: "bank_transfer", transactionId: "UTR-JUL-NIKHIL-001", paidAt: new Date(2025,6,1), by: owner._id }
    ];
    for (const p of julPay) {
        const v = inv(2, p.ti);
        const doc = {
            invoice: v._id, tenant: v.tenant, hostel: v.hostel,
            amount: p.amount, method: p.method,
            paidAt: p.paidAt, recordedBy: p.by,
            ...(p.notes ? { notes: p.notes } : {})
        };
        if (p.transactionId) doc.transactionId = p.transactionId;
        payDocs.push(doc);
    }

    const createdPayments = await Payment.insertMany(payDocs);
    console.log(`    ${createdPayments.length} payments created\n`);

    // ── 8. Complaints ────────────────────────────────────────────────────
    console.log("📣  Creating complaints...");
    await Complaint.insertMany([
        { tenant: tAarav._id,  hostel: hostel1._id, category: "Maintenance", title: "AC not cooling properly",        description: "Room 101 AC makes loud noise and does not cool below 28C.", status: "in-progress", assignedTo: staff._id },
        { tenant: tKaran._id,  hostel: hostel1._id, category: "Cleanliness", title: "Common bathroom not cleaned",     description: "Shared bathroom on floor 1 not cleaned for 3 days.",       status: "open" },
        { tenant: tRohit._id,  hostel: hostel1._id, category: "Security",    title: "Main gate lock broken",           description: "Main gate lock broken — anyone can enter at night.",        status: "resolved",   assignedTo: staff._id },
        { tenant: tNikhil._id, hostel: hostel2._id, category: "Internet",    title: "WiFi very slow after 8 PM",       description: "Speed drops below 1 Mbps every evening.",                    status: "open" },
        { tenant: tPriya._id,  hostel: hostel2._id, category: "Maintenance", title: "Geyser not working in A-02",      description: "Geyser in room A-02 not working since last week.",           status: "in-progress", assignedTo: staff._id }
    ]);
    console.log("    5 complaints created\n");

    // ── 9. Expenses ──────────────────────────────────────────────────────
    console.log("💸  Creating expenses...");
    await Expense.insertMany([
        { hostel: hostel1._id, category: "Maintenance", description: "AC servicing for 3 rooms",       amount: 4500,  date: new Date(2025,5,10), addedBy: owner._id },
        { hostel: hostel1._id, category: "Utilities",   description: "Electricity bill – June 2025",   amount: 12800, date: new Date(2025,5,28), addedBy: owner._id },
        { hostel: hostel2._id, category: "Supplies",    description: "Bedsheets and pillowcases",       amount: 3200,  date: new Date(2025,6,1),  addedBy: staff._id }
    ]);
    console.log("    3 expenses created\n");

    // ── Done ─────────────────────────────────────────────────────────────
    console.log("═══════════════════════════════════════════════════════════");
    console.log("✅  SEED COMPLETE\n");
    console.log("  OWNER");
    console.log("    Email    : owner@hostel.com");
    console.log(`    Password : ${OWNER_PW}\n`);
    console.log("  STAFF");
    console.log("    Email    : staff@hostel.com");
    console.log(`    Password : ${STAFF_PW}\n`);
    console.log("  TENANTS  (all share the same password)");
    tenantData.forEach(t => console.log(`    ${t.email.padEnd(28)} ${TENANT_PW}`));
    console.log("\n  HOSTEL 1  — Sunrise Boys Hostel");
    console.log("    Room 101 (single, ₹8000): Aarav         Bed 1");
    console.log("    Room 102 (double, ₹6000): Meera Bed 1 | Karan Bed 2");
    console.log("    Room 103 (triple, ₹5000): Pooja Bed 1 | Rohit Bed 2 | Sneha Bed 3");
    console.log("    Room 201 (double, ₹6500): VACANT");
    console.log("    Room 202 (dorm,   ₹3500): Arjun Bed 1 | Divya Bed 2  (4 free)");
    console.log("\n  HOSTEL 2  — Green Valley Girls PG");
    console.log("    Room A-01 (single, ₹9000): Nikhil       Bed 1");
    console.log("    Room A-02 (double, ₹7000): Priya        Bed 1  (1 free)");
    console.log("    Room A-03 (triple, ₹5500): VACANT");
    console.log("\n  INVOICE STATUS (Jul 2025 — use for dues testing)");
    console.log("    paid           : Aarav (8000), Arjun (3500), Nikhil (9000)");
    console.log("    partially_paid : Meera (3000 of 6000 paid)");
    console.log("    overdue        : Karan, Pooja, Divya, Priya");
    console.log("    unpaid         : Rohit, Sneha");
    console.log("═══════════════════════════════════════════════════════════\n");

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => {
    console.error("\n❌  Seed failed:", err.message);
    console.error(err);
    mongoose.disconnect();
    process.exit(1);
});
