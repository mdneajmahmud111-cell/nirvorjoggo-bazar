import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="container-page grid grid-cols-2 gap-8 py-10 text-sm text-gray-600 md:grid-cols-4">
        <div>
          <h3 className="mb-3 font-semibold text-gray-900">Nirvorjoggo Bazar</h3>
          <p>Your trusted online marketplace in Bangladesh.</p>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-gray-900">Shop</h3>
          <ul className="space-y-2">
            <li><Link href="/shop" className="hover:text-brand-700">All Products</Link></li>
            <li><Link href="/track-order" className="hover:text-brand-700">Track Order</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-gray-900">Account</h3>
          <ul className="space-y-2">
            <li><Link href="/login" className="hover:text-brand-700">Sign in</Link></li>
            <li><Link href="/register" className="hover:text-brand-700">Create account</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-gray-900">Legal</h3>
          <ul className="space-y-2">
            <li><Link href="/legal/terms" className="hover:text-brand-700">Terms of Service</Link></li>
            <li><Link href="/legal/privacy-policy" className="hover:text-brand-700">Privacy Policy</Link></li>
            <li><Link href="/legal/refund-policy" className="hover:text-brand-700">Refund Policy</Link></li>
            <li><Link href="/legal/shipping-policy" className="hover:text-brand-700">Shipping Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Nirvorjoggo Bazar. All rights reserved.
      </div>
    </footer>
  );
}
