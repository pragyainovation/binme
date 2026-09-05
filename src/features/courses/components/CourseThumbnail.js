"use client";

const palettes = [
  ["#163b35", "#4cae83", "#d8f95e"],
  ["#33205f", "#8d70df", "#ffcf70"],
  ["#123e68", "#3e9cce", "#b9f1e0"],
  ["#7a2e45", "#ed6c75", "#ffd188"],
  ["#69391c", "#e8913b", "#f8e39a"],
];

function paletteFor(value = "course") {
  const hash = [...value].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 7);
  return palettes[hash % palettes.length];
}

export default function CourseThumbnail({ course, compact = false }) {
  const [dark, accent, light] = paletteFor(course.id || course.title);
  return <div style={{ ...styles.art, minHeight: compact ? 120 : 180, background: `linear-gradient(135deg, ${dark}, ${accent})` }} aria-hidden="true">
    <span style={{ ...styles.orb, background: light }} />
    <span style={styles.brand}>BINME</span>
    <strong style={{ ...styles.title, fontSize: compact ? 18 : 24 }}>{course.title}</strong>
  </div>;
}

const styles = {
  art: { position: "relative", overflow: "hidden", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", justifyContent: "flex-end", color: "#fff", isolation: "isolate" },
  orb: { position: "absolute", width: 140, height: 140, borderRadius: "50%", top: -52, right: -34, opacity: 0.78, filter: "blur(1px)", zIndex: -1 },
  brand: { position: "absolute", top: 15, left: 16, fontSize: 11, fontWeight: 900, letterSpacing: 2 },
  title: { maxWidth: "90%", lineHeight: 1.1, letterSpacing: -0.5, textShadow: "0 2px 12px rgba(0,0,0,.24)" },
};
