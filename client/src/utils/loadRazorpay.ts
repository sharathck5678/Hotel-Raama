/**
 * Dynamic Razorpay Checkout SDK loader.
 * Loads checkout.js on-demand only when payment or checkout is initiated,
 * avoiding render-blocking script execution on initial page load.
 */

declare global {
  interface Window {
    Razorpay?: any;
  }
}

let razorpayPromise: Promise<boolean> | null = null;

export const loadRazorpay = (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  // Already loaded
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  // Ongoing load promise
  if (razorpayPromise) {
    return razorpayPromise;
  }

  razorpayPromise = new Promise<boolean>((resolve) => {
    // Check if script tag is already in DOM
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => {
        razorpayPromise = null;
        resolve(false);
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout SDK.');
      razorpayPromise = null; // Allow retry on failure
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return razorpayPromise;
};
