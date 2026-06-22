import { clsx as cx } from "clsx";
import AnimatedNumber from "./AnimatedNumber";

/**
 * Shared stat display used on Overview summary row, FieldDetail live-readings,
 * History summary, and the Landing page preview — same component everywhere.
 */
export default function StatBlock({
  label,
  value,
  unit,
  decimals = 1,
  animated = false,
  valueSize = "3xl",
  valueColor,
  sub,
  className,
}) {
  const sizeMap = { "2xl": "text-2xl", "3xl": "text-3xl", "4xl": "text-4xl" };

  return (
    <div className={cx(className)}>
      <div className="flex items-baseline gap-1.5 leading-none">
        <span
          className={cx(
            "font-mono tabular-nums font-semibold",
            sizeMap[valueSize] ?? "text-3xl",
            valueColor ?? "text-surface-900"
          )}
        >
          {animated && typeof value === "number" ? (
            <AnimatedNumber value={value} decimals={decimals} />
          ) : (
            value
          )}
        </span>
        {unit && (
          <span className="text-sm font-normal text-surface-400">{unit}</span>
        )}
      </div>
      <p className="text-xs text-surface-500 mt-1.5 font-medium leading-none">{label}</p>
      {sub && <p className="text-[11px] text-surface-400 mt-0.5">{sub}</p>}
    </div>
  );
}
