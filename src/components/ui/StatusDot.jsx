import { clsx as cx } from "clsx";

export default function StatusDot({ status, className }) {
  const isLive = status === "live";
  const isDemo = status === "demo";
  return (
    <span className={cx("relative inline-flex h-2 w-2 shrink-0", className)}>
      {(isLive || isDemo) && (
        <span
          className={cx("absolute inline-flex h-full w-full rounded-full animate-ping-live", {
            "bg-semantic-green/50": isLive,
            "bg-sky-400/50": isDemo,
          })}
        />
      )}
      <span
        className={cx("relative inline-flex h-2 w-2 rounded-full", {
          "bg-semantic-green": isLive,
          "bg-sky-400": isDemo,
          "bg-semantic-amber": status === "buffered",
          "bg-surface-300": !isLive && !isDemo && status !== "buffered",
        })}
      />
    </span>
  );
}
