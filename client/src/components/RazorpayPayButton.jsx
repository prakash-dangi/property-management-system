// Props:
//   invoice   - the invoice object (must have _id, totalAmount, paidAmount, status)
//   onSuccess - fn({ invoice }) called after payment confirmed server-side
//   disabled  - bool (optional)

import { useState } from "react";
import toast from "react-hot-toast";
import { useRazorpay } from "../hooks/useRazorpay";
import { createRazorpayOrder, getRazorpayOrderStatus, fetchMyInvoices } from "../api/tenantPortalApi";
import useAuthStore from "../store/authStore";

const POLL_INTERVAL_MS   = 2000;   // check every 2 seconds
const POLL_MAX_ATTEMPTS  = 15;     // give up after 30 seconds (15 × 2s)

export default function RazorpayPayButton({ invoice, onSuccess, disabled = false }) {
    const { isLoaded, error: sdkError } = useRazorpay();
    const user = useAuthStore(state => state.user);

    const [paying,  setPaying]  = useState(false);
    const [polling, setPolling] = useState(false);

    const remaining = (invoice.totalAmount - invoice.paidAmount);
    const isPayable = !["paid", "waived"].includes(invoice.status) && remaining > 0;

    // ── Poll for server-side confirmation ───────────────────────────────
    // After the Razorpay Checkout success callback, we don't immediately
    // trust it. We poll our own backend to confirm the webhook was received
    // and the invoice was updated.
    const pollForConfirmation = async (razorpayOrderId) => {
        setPolling(true);
        let attempts = 0;

        const poll = async () => {
            attempts++;
            try {
                const { status, invoice: updatedInvoice } = await getRazorpayOrderStatus(razorpayOrderId);

                if (status === "captured") {
                    // Webhook was processed — update the UI
                    setPolling(false);
                    toast.success("Payment confirmed! Invoice updated.");
                    onSuccess?.({ invoice: updatedInvoice });
                    return;
                }

                if (attempts < POLL_MAX_ATTEMPTS) {
                    setTimeout(poll, POLL_INTERVAL_MS);
                } else {
                    // Webhook may still be in flight — tell user to refresh
                    setPolling(false);
                    toast("Payment received. Invoice will update shortly.", {
                        icon: "⏳"
                    });
                    // Still call onSuccess to trigger a refetch
                    onSuccess?.({ invoice: null });
                }
            } catch {
                if (attempts < POLL_MAX_ATTEMPTS) {
                    setTimeout(poll, POLL_INTERVAL_MS);
                } else {
                    setPolling(false);
                    toast.error("Could not confirm payment. Please refresh.");
                }
            }
        };

        poll();
    };

    // ── Handle Pay Now click ────────────────────────────────────────────
    const handlePayNow = async () => {
        if (!isLoaded) {
            toast.error("Payment system is loading, please try again");
            return;
        }

        setPaying(true);
        let orderData = null;

        try {
            // Step 1: Create order on our backend
            orderData = await createRazorpayOrder(invoice._id, remaining);
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not initiate payment");
            setPaying(false);
            return;
        }

        // Step 2: Open Razorpay Checkout modal
        const options = {
            key:         orderData.key,
            amount:      orderData.amount,     // in paise
            currency:    orderData.currency,
            name:        orderData.hostelName,
            description: orderData.description,
            order_id:    orderData.orderId,
            prefill: {
                name:  user?.name  || "",
                email: user?.email || "",
                contact: ""  // don't prefill phone for privacy
            },
            theme: {
                color: "#4F46E5"  // match your UI primary color
            },

            // ── Success callback ──────────────────────────────────────
            // This fires in the BROWSER after payment, but BEFORE the webhook.
            // Do NOT update the database here — the webhook is authoritative.
            // Only use this for UX (show loading, start polling).
            handler: async (response) => {
                // response: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
                // Start polling our backend to confirm the webhook was processed
                pollForConfirmation(response.razorpay_order_id);
            },

            // ── Modal closed callback ─────────────────────────────────
            // Tenant dismissed the checkout modal without paying.
            modal: {
                ondismiss: () => {
                    setPaying(false);
                    // Don't show an error — they just closed the modal
                }
            }
        };

        const rzp = new window.Razorpay(options);

        // ── Payment failure inside the modal ──────────────────────────
        rzp.on("payment.failed", (response) => {
            setPaying(false);
            toast.error(
                response.error?.description || "Payment failed. Please try again."
            );
        });

        rzp.open();
        // Note: setPaying(false) is NOT called here — it stays true until
        // either the modal closes (ondismiss) or the handler callback fires.
    };

    if (sdkError) {
        return (
            <p className="text-xs text-red-500">
                Payment system unavailable. Please refresh the page.
            </p>
        );
    }

    if (!isPayable) return null;

    return (
        <button
            onClick={handlePayNow}
            disabled={disabled || paying || polling || !isLoaded}
            className="
                px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl
                hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors flex items-center gap-2
            "
        >
            {polling ? (
                <>
                    <span className="animate-spin">⏳</span>
                    Confirming...
                </>
            ) : paying ? (
                "Opening checkout..."
            ) : (
                <>Pay ₹{remaining.toLocaleString("en-IN")}</>
            )}
        </button>
    );
}