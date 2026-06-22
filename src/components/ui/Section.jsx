import { clsx as cx } from "clsx";

/**
 * Consistent vertical-rhythm wrapper for every section on every page.
 * Apply `tinted` for alternating background bands on the landing page.
 */
export default function Section({ children, className, tinted, narrow, id }) {
  return (
    <section
      id={id}
      className={cx(
        "py-20 md:py-24",
        tinted ? "bg-surface-100/50" : "bg-surface-50",
        className
      )}
    >
      <div className={cx("mx-auto px-6", narrow ? "max-w-3xl" : "max-w-5xl")}>
        {children}
      </div>
    </section>
  );
}
