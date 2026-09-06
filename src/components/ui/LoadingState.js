import Loader from "./Loader";

export default function LoadingState({ message = "Loading..." }) {
  return <div style={{ display: "grid", justifyItems: "center", gap: 12, padding: 24 }}><Loader label={message} /><p>{message}</p></div>;
}
