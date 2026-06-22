import { clsx as cx } from "clsx";

export default function StatusDot({ status, className }) {
  const isLive = status === "live";
  return (
    <span className={cx("relative inline-flex h-2 w-2 shrink-0", className)}>
      {isLive && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-semantic-green/50 animate-ping-live" />
      )}
      <span
        className={cx("relative inline-flex h-2 w-2 rounded-full", {
          "bg-semantic-green": isLive,
          "bg-semantic-amber": status === "buffered",
          "bg-surface-300": !isLive && status !== "buffered",
        })}
      />
    </span>
  );
}
