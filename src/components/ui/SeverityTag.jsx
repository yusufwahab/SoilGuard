import { clsx as cx } from "clsx";

const CONFIG = {
  normal:   { label: "Normal",   cls: "text-semantic-green" },
  watch:    { label: "Watch",    cls: "text-semantic-amber" },
  critical: { label: "Critical", cls: "text-semantic-red"   },
};

export default function SeverityTag({ level = "normal", className }) {
  const { label, cls } = CONFIG[level] ?? CONFIG.normal;
  return (
    <span className={cx("text-[11px] font-semibold tracking-wide", cls, className)}>
      {label}
    </span>
  );
}
