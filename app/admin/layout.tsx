import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";

export const metadata = { title: "Admin – Ableverse" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar-nav">
        <div className="admin-sidebar-nav__brand">Ableverse Admin</div>
        <nav>
          <ul>
            <li><Link href="/admin">Dashboard</Link></li>
            <li><Link href="/admin/ratings">Ratings</Link></li>
            <li><Link href="/admin/venues">Venues</Link></li>
            <li><Link href="/admin/users">Users</Link></li>
            <li className="admin-sidebar-nav__divider" />
            <li><Link href="/">← Back to site</Link></li>
          </ul>
        </nav>
      </aside>
      <div className="admin-main">
        {children}
      </div>
    </div>
  );
}
