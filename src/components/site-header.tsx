"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export function SiteHeader() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="text-lg font-bold text-brand-700">
          Nirvorjoggo Bazar
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-700 md:flex">
          <Link href="/shop" className="hover:text-brand-700">Shop</Link>
          <Link href="/search" className="hover:text-brand-700">Search</Link>
          <Link href="/track-order" className="hover:text-brand-700">Track Order</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/cart" className="btn-secondary" aria-label="Cart">
            Cart
          </Link>
          {session?.user ? (
            <div className="relative">
              <button onClick={() => setOpen((v) => !v)} className="btn-secondary">
                {session.user.name?.split(" ")[0] ?? "Account"}
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  <Link href="/account" className="block px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setOpen(false)}>
                    My Account
                  </Link>
                  <Link href="/account/orders" className="block px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setOpen(false)}>
                    My Orders
                  </Link>
                  {(session.user.role === "ADMIN" || session.user.role === "STAFF") && (
                    <Link href="/admin" className="block px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setOpen(false)}>
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-primary">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
