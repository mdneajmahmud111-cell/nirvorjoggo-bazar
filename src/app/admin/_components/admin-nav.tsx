"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/payment-methods", label: "Payment Methods" },
  { href: "/admin/bank-accounts", label: "Bank Accounts" },
  { href: "/admin/delivery-zones", label: "Delivery Zones" },
];

export function AdminNav({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 lg:w-60">
      <div className="card p-4">
        <p className="text-sm font-semibold text-gray-900">{userName}</p>
        <p className="text-xs text-gray-500">{userRole}</p>
        <Link href="/" className="mt-2 inline-block text-xs text-brand-700 hover:underline">
          Back to store
        </Link>
      </div>
      <nav className="card mt-4 flex flex-row flex-wrap gap-1 p-2 lg:flex-col">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
