import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/rbac";

export default async function AccountPage() {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  const links = [
    { href: "/account/orders", label: "My Orders", description: "View your order history and track shipments" },
    { href: "/account/addresses", label: "Addresses", description: "Manage your saved delivery addresses" },
    { href: "/account/profile", label: "Profile", description: "Update your name and email" },
    { href: "/account/reviews", label: "My Reviews", description: "See the reviews you've written" },
  ];

  return (
    <div className="container-page py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">My Account</h1>
      <p className="mb-8 text-sm text-gray-600">
        {session.user.name} · {session.user.phone}
        {session.user.email ? ` · ${session.user.email}` : ""}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="card block p-5 transition-shadow hover:shadow-md">
            <h2 className="font-semibold text-gray-900">{link.label}</h2>
            <p className="mt-1 text-sm text-gray-500">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
