const Invoice = require("../models/Invoice");

// Returns financial summary for a tenant:
//   totalInvoiced — sum of all invoice totalAmounts ever created
//   totalPaid     — sum of all paidAmounts
//   pendingAmount — what is still owed (unpaid + partially_paid + overdue)
//
// Used by:
//   - checkOutTenant → to block checkout if pendingAmount > 0
//   - getCheckInSummary → to show financial summary before checkout modal
//   - tenantPortal/my-invoices (future)

const getTenantFinancialSummary = async (tenantId) => {
    const invoices = await Invoice.find({ tenant: tenantId });

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

    // pendingAmount = sum of (totalAmount - paidAmount) for non-waived invoices
    const pendingAmount = invoices
        .filter(inv => inv.status !== "waived" && inv.status !== "paid")
        .reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

    return {
        totalInvoiced,
        totalPaid,
        pendingAmount
    };
};

module.exports = getTenantFinancialSummary;