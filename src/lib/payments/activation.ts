import { env } from "@/lib/env";

export interface ActivationCheck {
  ok: boolean;
  reason?: string;
}

export interface ActivationInput {
  code: string;
  mode: string;
  merchantNumber: string | null;
}

/**
 * Whether a payment method can safely be switched on for customers right now, given its
 * current admin-configured fields (mode, merchantNumber) and the server's environment. This is
 * the single source of truth for both the admin activation guard
 * (/api/admin/payment-methods/[id]) and the "Credentials configured" badge in the Payment
 * Methods UI — it must never let a method appear usable when it actually isn't.
 *
 * bKash and Nagad support two modes: MANUAL (owner's personal/merchant number, customer submits
 * a transaction ID, admin verifies by hand — needs no API credentials) or AUTOMATIC (real
 * merchant Checkout API). Rocket is always manual — DBBL has no public checkout API for
 * arbitrary merchants — but its manual number can come from either the admin-configured
 * merchantNumber or, as a deploy-time default, ROCKET_MERCHANT_NUMBER. Bank Transfer and COD
 * need nothing here. SSLCommerz has no manual equivalent and always needs its store credentials.
 */
export function canActivatePaymentMethod(method: ActivationInput): ActivationCheck {
  switch (method.code) {
    case "COD":
    case "BANK_TRANSFER":
      return { ok: true };

    case "ROCKET":
      return method.merchantNumber || env.rocket.isConfigured()
        ? { ok: true }
        : {
            ok: false,
            reason: "Set a personal/merchant Rocket number on this method (or ROCKET_MERCHANT_NUMBER in the environment) before activating.",
          };

    case "BKASH":
      if (method.mode === "AUTOMATIC") {
        return env.bkash.isConfigured()
          ? { ok: true }
          : {
              ok: false,
              reason:
                "Automatic mode needs BKASH_USERNAME, BKASH_PASSWORD, BKASH_APP_KEY and BKASH_APP_SECRET set on the server. Switch this method to Manual mode to launch without them.",
            };
      }
      return method.merchantNumber
        ? { ok: true }
        : { ok: false, reason: "Manual mode needs a personal/merchant bKash number set on this method before activating." };

    case "NAGAD":
      if (method.mode === "AUTOMATIC") {
        return env.nagad.isConfigured()
          ? { ok: true }
          : {
              ok: false,
              reason:
                "Automatic mode needs NAGAD_MERCHANT_ID, NAGAD_MERCHANT_NUMBER, NAGAD_MERCHANT_PRIVATE_KEY and NAGAD_PUBLIC_KEY set on the server. Switch this method to Manual mode to launch without them.",
            };
      }
      return method.merchantNumber
        ? { ok: true }
        : { ok: false, reason: "Manual mode needs a personal/merchant Nagad number set on this method before activating." };

    case "SSLCOMMERZ":
      return env.sslcommerz.isConfigured()
        ? { ok: true }
        : { ok: false, reason: "Needs SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD set on the server." };

    default:
      return { ok: false, reason: "Unknown payment method" };
  }
}
