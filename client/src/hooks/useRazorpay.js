import { useState, useEffect } from "react";

// Dynamically loads the Razorpay Checkout script.
// Returns: { isLoaded: boolean, error: string | null }
//
// The script is loaded only when the hook is first used.
// Subsequent uses (e.g. navigating back to the page) reuse
// the already-loaded script from the browser cache.

function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
        // If already loaded (e.g. navigating back to the page), resolve immediately
        if (window.Razorpay) {
            resolve(true);
            return;
        }

        const script = document.createElement("script");
        script.src   = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;

        script.onload  = () => resolve(true);
        script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));

        document.head.appendChild(script);
    });
}

export function useRazorpay() {
    const [isLoaded, setIsLoaded] = useState(!!window.Razorpay);
    const [error, setError]       = useState(null);

    useEffect(() => {
        if (window.Razorpay) {
            setIsLoaded(true);
            return;
        }

        loadRazorpayScript()
            .then(() => setIsLoaded(true))
            .catch(err => setError(err.message));
    }, []);

    return { isLoaded, error };
}