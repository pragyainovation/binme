export default function FormField({ label, children }) {
  return <label style={{ display: "grid", gap: 8 }}>{label}{children}</label>;
}
