export const metadata = { title: "Refund Policy — Nirvorjoggo Bazar" };

export default function RefundPolicyPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Refund &amp; Return Policy</h1>
      <p className="mb-8 text-sm text-gray-500">Last updated: September 2026</p>

      <div className="space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">1. Eligibility for Returns</h2>
          <p>
            Most items can be returned within 7 days of delivery if they are unused, in their original packaging,
            and accompanied by proof of purchase (your order number). Perishable goods, personal care items, and
            items marked as non-returnable at the time of purchase are not eligible for return.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">2. Damaged or Incorrect Items</h2>
          <p>
            If you receive a damaged, defective, or incorrect item, please contact customer support within 48 hours
            of delivery with photos of the item and packaging. We will arrange a free replacement or a full refund,
            including any shipping fee you paid.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">3. How to Request a Return</h2>
          <p>
            Contact our customer support team with your order number and the reason for return. Once approved, we
            will arrange a pickup or provide return instructions. Please keep the item in its original condition
            until pickup is confirmed.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">4. Refund Method and Timeline</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Cash on Delivery orders are refunded via bKash, Nagad, or bank transfer to the details you provide</li>
            <li>Mobile wallet payments (bKash, Nagad, Rocket) are refunded to the same wallet used for payment</li>
            <li>Card and SSLCommerz payments are refunded to the original payment method</li>
            <li>Bank transfer payments are refunded to the originating bank account</li>
          </ul>
          <p className="mt-2">
            Refunds are typically processed within 5–10 business days after the returned item is received and
            inspected, or after approval for damaged/incorrect item claims.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">5. Order Cancellations</h2>
          <p>
            Orders can be cancelled free of charge before they are shipped. Once an order has been handed over to
            our courier partner, it can no longer be cancelled and must instead follow the return process above
            after delivery.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">6. Non-Refundable Situations</h2>
          <p>
            We cannot offer a refund for items damaged due to misuse after delivery, missing items reported after 48
            hours without evidence, or orders where the delivery address provided was incorrect or incomplete.
          </p>
        </section>
      </div>
    </div>
  );
}
