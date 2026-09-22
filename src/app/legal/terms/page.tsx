export const metadata = { title: "Terms of Service — Nirvorjoggo Bazar" };

export default function TermsPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mb-8 text-sm text-gray-500">Last updated: September 2026</p>

      <div className="space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or placing an order through Nirvorjoggo Bazar (&ldquo;we&rdquo;, &ldquo;us&rdquo;, the
            &ldquo;Platform&rdquo;), you agree to be bound by these Terms of Service and our Privacy Policy. If you
            do not agree with any part of these terms, please do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">2. Eligibility and Accounts</h2>
          <p>
            You must provide accurate and current information when creating an account or placing an order,
            including a valid Bangladeshi mobile number. You are responsible for maintaining the confidentiality of
            your account password and for all activity under your account.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">3. Orders and Pricing</h2>
          <p>
            All product prices are listed in Bangladeshi Taka (BDT) and are inclusive of applicable taxes unless
            stated otherwise. Shipping fees are calculated at checkout based on your delivery address and cart
            weight, and are shown before you place your order. We reserve the right to refuse or cancel any order,
            including in cases of suspected fraud, pricing errors, or unavailable stock, in which case any payment
            already made will be refunded.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">4. Payments</h2>
          <p>
            We accept Cash on Delivery and a selection of mobile financial services and bank transfer options shown
            at checkout. For manually verified payment methods (such as Rocket or bank transfer), your order will be
            confirmed only after our team verifies the transaction details you submit.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">5. Delivery</h2>
          <p>
            Estimated delivery timelines are provided at checkout and on your order confirmation and vary by
            delivery zone. Delays may occur due to courier availability, weather, or circumstances beyond our
            control. See our{" "}
            <a href="/legal/shipping-policy" className="text-brand-700 hover:underline">
              Shipping Policy
            </a>{" "}
            for details.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">6. Returns and Refunds</h2>
          <p>
            Please refer to our{" "}
            <a href="/legal/refund-policy" className="text-brand-700 hover:underline">
              Refund Policy
            </a>{" "}
            for information on returns, exchanges, and refund timelines.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">7. Product Reviews</h2>
          <p>
            Reviews may only be submitted by customers who have received a delivered order containing the product.
            Reviews are moderated before publication and must not contain abusive, misleading, or unlawful content.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by the laws of Bangladesh, Nirvorjoggo Bazar shall not be liable for any
            indirect, incidental, or consequential damages arising from your use of the Platform.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">9. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Platform after changes take effect
            constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">10. Contact Us</h2>
          <p>
            If you have questions about these Terms, please reach out through our customer support channels listed
            on the Platform.
          </p>
        </section>
      </div>
    </div>
  );
}
