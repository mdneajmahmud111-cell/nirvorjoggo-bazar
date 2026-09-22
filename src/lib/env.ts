// Centralized, typed access to environment configuration.
// No business value (fees, phone numbers, merchant numbers) is ever hard-coded here —
// only infrastructure endpoints and secrets that must come from the deployment environment.

function optional(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

function required(key: string): string {
  const value = optional(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  appUrl: optional("APP_URL") ?? "http://localhost:3000",
  databaseUrl: () => required("DATABASE_URL"),

  nextAuthSecret: () => required("NEXTAUTH_SECRET"),

  upload: {
    dir: optional("UPLOAD_DIR") ?? "./public/uploads",
    maxSizeMb: Number(optional("MAX_UPLOAD_SIZE_MB") ?? "5"),
  },

  bkash: {
    baseUrl: () => required("BKASH_BASE_URL"),
    username: () => required("BKASH_USERNAME"),
    password: () => required("BKASH_PASSWORD"),
    appKey: () => required("BKASH_APP_KEY"),
    appSecret: () => required("BKASH_APP_SECRET"),
    callbackUrl: () => optional("BKASH_CALLBACK_URL") ?? `${optional("APP_URL") ?? "http://localhost:3000"}/api/payments/bkash/callback`,
    isConfigured: () =>
      Boolean(optional("BKASH_USERNAME") && optional("BKASH_PASSWORD") && optional("BKASH_APP_KEY") && optional("BKASH_APP_SECRET")),
  },

  nagad: {
    baseUrl: () => required("NAGAD_BASE_URL"),
    merchantId: () => required("NAGAD_MERCHANT_ID"),
    merchantNumber: () => required("NAGAD_MERCHANT_NUMBER"),
    privateKey: () => required("NAGAD_MERCHANT_PRIVATE_KEY").replace(/\\n/g, "\n"),
    publicKey: () => required("NAGAD_PUBLIC_KEY").replace(/\\n/g, "\n"),
    callbackUrl: () => optional("NAGAD_CALLBACK_URL") ?? `${optional("APP_URL") ?? "http://localhost:3000"}/api/payments/nagad/callback`,
    isConfigured: () =>
      Boolean(optional("NAGAD_MERCHANT_ID") && optional("NAGAD_MERCHANT_NUMBER") && optional("NAGAD_MERCHANT_PRIVATE_KEY") && optional("NAGAD_PUBLIC_KEY")),
  },

  rocket: {
    merchantNumber: () => required("ROCKET_MERCHANT_NUMBER"),
    merchantAccountType: optional("ROCKET_MERCHANT_ACCOUNT_TYPE") ?? "Personal",
    verificationApiUrl: optional("ROCKET_VERIFICATION_API_URL"),
    verificationApiKey: optional("ROCKET_VERIFICATION_API_KEY"),
    isConfigured: () => Boolean(optional("ROCKET_MERCHANT_NUMBER")),
  },

  sslcommerz: {
    storeId: () => required("SSLCOMMERZ_STORE_ID"),
    storePassword: () => required("SSLCOMMERZ_STORE_PASSWORD"),
    isLive: () => optional("SSLCOMMERZ_IS_LIVE") === "true",
    successUrl: () => optional("SSLCOMMERZ_SUCCESS_URL") ?? `${optional("APP_URL") ?? "http://localhost:3000"}/api/payments/sslcommerz/success`,
    failUrl: () => optional("SSLCOMMERZ_FAIL_URL") ?? `${optional("APP_URL") ?? "http://localhost:3000"}/api/payments/sslcommerz/fail`,
    cancelUrl: () => optional("SSLCOMMERZ_CANCEL_URL") ?? `${optional("APP_URL") ?? "http://localhost:3000"}/api/payments/sslcommerz/cancel`,
    ipnUrl: () => optional("SSLCOMMERZ_IPN_URL") ?? `${optional("APP_URL") ?? "http://localhost:3000"}/api/payments/sslcommerz/ipn`,
    isConfigured: () => Boolean(optional("SSLCOMMERZ_STORE_ID") && optional("SSLCOMMERZ_STORE_PASSWORD")),
  },

  steadfast: {
    baseUrl: () => optional("STEADFAST_BASE_URL") ?? "https://portal.packzy.com/api/v1",
    apiKey: () => required("STEADFAST_API_KEY"),
    secretKey: () => required("STEADFAST_SECRET_KEY"),
    isConfigured: () => Boolean(optional("STEADFAST_API_KEY") && optional("STEADFAST_SECRET_KEY")),
  },

  pathao: {
    baseUrl: () => optional("PATHAO_BASE_URL") ?? "https://api-hermes.pathao.com",
    clientId: () => required("PATHAO_CLIENT_ID"),
    clientSecret: () => required("PATHAO_CLIENT_SECRET"),
    username: () => required("PATHAO_USERNAME"),
    password: () => required("PATHAO_PASSWORD"),
    storeId: () => required("PATHAO_STORE_ID"),
    isConfigured: () =>
      Boolean(optional("PATHAO_CLIENT_ID") && optional("PATHAO_CLIENT_SECRET") && optional("PATHAO_USERNAME") && optional("PATHAO_PASSWORD")),
  },

  rateLimit: {
    windowMs: Number(optional("RATE_LIMIT_WINDOW_MS") ?? "60000"),
    maxRequests: Number(optional("RATE_LIMIT_MAX_REQUESTS") ?? "60"),
  },
};

/**
 * Whether the given payment method's real provider credentials are present in this
 * deployment's environment. COD and Bank Transfer need none (manual flows), so they're
 * always "configured". Used to stop an admin from activating a gateway that has no
 * working credentials behind it — see /api/admin/payment-methods/[id].
 */
export function isProviderConfigured(code: string): boolean {
  switch (code) {
    case "BKASH":
      return env.bkash.isConfigured();
    case "NAGAD":
      return env.nagad.isConfigured();
    case "ROCKET":
      return env.rocket.isConfigured();
    case "SSLCOMMERZ":
      return env.sslcommerz.isConfigured();
    case "COD":
    case "BANK_TRANSFER":
      return true;
    default:
      return false;
  }
}
