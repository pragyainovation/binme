"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import { logout } from "../../firebase/auth";

export default function AdminDashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { href: "/admin/dashboard", label: "Overview" },
    { href: "/admin/dashboard/sessions", label: "Sessions" },
    { href: "/admin/dashboard/sessions/create", label: "Create Session" },
    { href: "/admin/dashboard/free-webinar", label: "Free Webinar" },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace("/admin/login");
  };

  return (
    <ProtectedRoute requiredRole="admin" redirectTo="/admin/login">
      <div className="admin-dashboard-shell">
        <aside className={`admin-dashboard-sidebar ${menuOpen ? "open" : ""}`}>
          <div className="admin-dashboard-brand">BinMe Admin</div>

          <nav className="admin-dashboard-nav" aria-label="Admin dashboard navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname === item.href ? "admin-dashboard-link active" : "admin-dashboard-link"}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button type="button" className="admin-dashboard-logout" onClick={handleLogout}>
            Logout
          </button>
        </aside>

        <div className="admin-dashboard-main">
          <header className="admin-dashboard-mobile-header">
            <div className="admin-dashboard-brand mobile">BinMe Admin</div>
            <button
              type="button"
              className="admin-dashboard-menu-button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle admin menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? "✕" : "Menu"}
            </button>
          </header>
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}
