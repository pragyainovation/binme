"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import { logout } from "../firebase/auth";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/registrations", label: "My Registrations" },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <ProtectedRoute requiredRole="user" redirectTo="/login">
      <div className="dashboard-shell">
        <aside className={`dashboard-sidebar ${menuOpen ? "open" : ""}`}>
          <div className="dashboard-brand">BinMe</div>

          <nav className="dashboard-nav" aria-label="Dashboard navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname === item.href ? "dashboard-link active" : "dashboard-link"}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button type="button" className="dashboard-logout" onClick={handleLogout}>
            Logout
          </button>
        </aside>

        <div className="dashboard-main">
          <header className="dashboard-mobile-header">
            <div className="dashboard-brand mobile">BinMe</div>
            <button
              type="button"
              className="dashboard-menu-button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle dashboard menu"
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
