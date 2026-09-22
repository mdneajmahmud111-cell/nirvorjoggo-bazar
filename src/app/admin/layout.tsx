import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { AdminNav } from "./_components/admin-nav";

export const metadata = {
  title: "Admin | Nirvorjoggo Bazar",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let userName = "";
  let userRole = "";
  try {
    const session = await requireRole("ADMIN", "STAFF");
    userName = session.user.name ?? "Admin";
    userRole = session.user.role;
  } catch {
    redirect("/login");
  }

  return (
    <div className="container-page py-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <AdminNav userName={userName} userRole={userRole} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
