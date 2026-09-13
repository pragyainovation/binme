"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/ui/DataTable";
import Loader from "@/components/ui/Loader";
import { getRegisteredUsers } from "@/features/users/user.repository";

function formatDate(value) {
  if (!value) return "-";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-IN");
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getRegisteredUsers()
      .then(setUsers)
      .catch((loadError) => setError(loadError.message || "Unable to load registered users."))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { header: "Name", accessorKey: "name", cell: ({ row }) => <strong>{row.original.name || "-"}</strong> },
    { header: "Email", accessorKey: "email", cell: ({ row }) => row.original.email || "-" },
    { header: "Mobile", accessorKey: "mobile", cell: ({ row }) => row.original.mobile || "-" },
    { header: "Signed up", accessorKey: "createdAt", cell: ({ row }) => formatDate(row.original.createdAt) },
  ];

  return <main style={styles.page}><div style={styles.container}><header style={styles.header}><div><p style={styles.eyebrow}>Accounts</p><h1 style={styles.title}>Registered Users</h1><p style={styles.subtitle}>All users who signed up on BinMe.</p></div><span style={styles.count}>{users.length} users</span></header>{loading ? <Loader label="Loading registered users" /> : error ? <p style={styles.error}>{error}</p> : <DataTable columns={columns} data={users} emptyMessage="No registered users yet." />}</div></main>;
}

const styles = { page: { minHeight: "100vh", background: "#f5f1ea", padding: "32px 20px" }, container: { maxWidth: 1100, margin: "0 auto" }, header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }, eyebrow: { margin: 0, color: "#ff724f", fontWeight: 800, textTransform: "uppercase" }, title: { fontSize: 36, margin: "6px 0" }, subtitle: { margin: 0, color: "#53615f" }, count: { background: "#dfe8ff", color: "#2941a8", padding: "8px 12px", borderRadius: 999, fontWeight: 700 }, error: { color: "#b42318", fontWeight: 700 } };
