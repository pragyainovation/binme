import styles from "./Loader.module.css";

export default function Loader({ label = "Loading", size = 50 }) {
  return <div className={styles.wrapper} role="status" aria-label={label}>
    <div className={styles.loader} style={{ "--loader-size": `${size}px` }} />
  </div>;
}
