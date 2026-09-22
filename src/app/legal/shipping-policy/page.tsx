export const metadata = { title: "Shipping Policy — Nirvorjoggo Bazar" };

export default function ShippingPolicyPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Shipping Policy</h1>
      <p className="mb-8 text-sm text-gray-500">Last updated: September 2026</p>

      <div className="space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">1. Delivery Zones</h2>
          <p>
            We currently deliver to locations across Bangladesh, organized into three zones: Inside Dhaka, Sub
            Dhaka, and Outside Dhaka. Delivery fees and estimated timelines vary by zone and are calculated
            automatically based on the division, district, and area you select at checkout.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">2. Shipping Fees</h2>
          <p>
            Your exact shipping fee is shown at checkout once you enter your delivery address, and takes into
            account your delivery zone and the total weight of items in your cart. Orders above a certain value may
            qualify for free shipping, which will be reflected automatically at checkout when applicable.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">3. Estimated Delivery Times</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Inside Dhaka: typically 1–2 business days</li>
            <li>Sub Dhaka (surrounding districts): typically 2–3 business days</li>
            <li>Outside Dhaka: typically 3–5 business days</li>
          </ul>
          <p className="mt-2">
            These are estimates, not guarantees. Actual delivery times may vary due to courier capacity, weather,
            regional holidays, or address accessibility. The specific estimate for your order is shown at checkout
            and on your order confirmation.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">4. Order Tracking</h2>
          <p>
            Once your order is placed, you can track its status any time using the{" "}
            <a href="/track-order" className="text-brand-700 hover:underline">
              Track Order
            </a>{" "}
            page with your order number and phone number, or from your account&rsquo;s order history if you are
            signed in.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">5. Undeliverable Areas</h2>
          <p>
            If your area is not yet part of our delivery network, checkout will let you know that we currently
            cannot deliver there. We are continually expanding our coverage across Bangladesh.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">6. Failed Delivery Attempts</h2>
          <p>
            Our courier partners will attempt to contact you using the phone number provided at checkout. If
            delivery cannot be completed after multiple attempts, the order may be returned to us, and you will be
            contacted to arrange redelivery or cancellation.
          </p>
        </section>
      </div>
    </div>
  );
}
