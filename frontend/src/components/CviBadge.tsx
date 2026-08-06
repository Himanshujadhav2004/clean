import { cviLabel, type CviStatus } from "../api";
import "./CviBadge.css";

export function CviBadge({ code }: { code: CviStatus }) {
  const { text, tone } = cviLabel(code);
  return (
    <span className={`badge ${tone}`}>
      <span className="dot" />
      {text}
    </span>
  );
}
