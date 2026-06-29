const Invoice = require("../models/Invoice");

// Generates the next sequential invoice number for a given year.
// Format: INV-{year}-{3-digit-padded-sequence}
// e.g. INV-2025-001, INV-2025-047, INV-2025-100
//
// Strategy: find the highest existing invoice number for this year
// by sorting descending on invoiceNumber. This works because the
// format is fixed-width padded, so alphabetical sort === numeric sort.
//
// If no invoice exists for this year, sequence starts at 1.
//
// Concurrency note: In a single-server environment this is safe.
// With multiple server instances, you could get duplicate sequence numbers
// in the rare race window between findOne and insertMany. The unique index
// on invoiceNumber in Invoice.js catches this — the second insert will
// throw a duplicate key error which the caller should handle.

const generateInvoiceNumber = async (year) => {
    const last = await Invoice.findOne(
        { invoiceNumber: { $regex: `^INV-${year}-` } },
        { invoiceNumber: 1 }
    ).sort({ invoiceNumber: -1 });

    let next = 1;
    if (last) {
        // Extract the sequence from e.g. "INV-2025-047"
        const parts = last.invoiceNumber.split("-");
        next = parseInt(parts[2], 10) + 1;
    }

    // Zero-pad to 3 digits (up to 999 invoices per year without breaking)
    // If you expect > 999 invoices/year, increase padding to 4
    const padded = String(next).padStart(3, "0");
    return `INV-${year}-${padded}`;
};

module.exports = generateInvoiceNumber;
