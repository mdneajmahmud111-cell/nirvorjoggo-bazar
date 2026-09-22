export const metadata = { title: "Privacy Policy — Nirvorjoggo Bazar" };

export default function PrivacyPolicyPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mb-8 text-sm text-gray-500">Last updated: September 2026</p>

      <div className="space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">1. Information We Collect</h2>
          <p>
            When you create an account, place an order, or contact us, we collect information such as your name,
            phone number, email address, delivery address, and order history. When you complete a payment, our
            payment partners (bKash, Nagad, SSLCommerz, or your bank) process your payment details directly — we do
            not store your card, wallet PIN, or banking credentials.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">2. How We Use Your Information</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To process and deliver your orders, including calculating shipping fees for your address</li>
            <li>To verify manual payments (Rocket, bank transfer) that you submit</li>
            <li>To communicate order updates, delivery status, and customer support responses</li>
            <li>To prevent fraud and enforce our Terms of Service</li>
            <li>To improve our products, categories, and overall shopping experience</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">3. Sharing of Information</h2>
          <p>
            We share necessary order and delivery information with our courier partners to fulfil your delivery, and
            payment references with our payment partners to process your transaction. We do not sell your personal
            information to third parties.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">4. Guest Checkout</h2>
          <p>
            You may place an order without creating an account. In this case, we retain your order details (name,
            phone, delivery address) to fulfil and let you track that order, but no password-protected account is
            created.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">5. Data Retention</h2>
          <p>
            We retain order and account information for as long as necessary to fulfil orders, comply with legal and
            tax obligations, and resolve disputes.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">6. Your Rights</h2>
          <p>
            You may review and update your name and email at any time from your account profile, manage your saved
            addresses, and request account deletion by contacting customer support.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">7. Security</h2>
          <p>
            We use industry-standard measures, including password hashing and access controls, to protect your
            information. However, no method of transmission over the internet is completely secure.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">8. Contact Us</h2>
          <p>For privacy-related questions, please contact our customer support team.</p>
        </section>
      </div>
    </div>
  );
}
