import { clsx as cx } from "clsx";

export default function Card({ children, className, tinted, padding = "md", as: Tag = "div" }) {
  const padMap = { none: "", xs: "p-3", sm: "p-4", md: "p-5", lg: "p-6" };
  return (
    <Tag
      className={cx(
        "border border-surface-200 rounded-xl",
        tinted ? "bg-surface-100/60" : "bg-surface-50",
        padMap[padding],
        className
      )}
    >
      {children}
    </Tag>
  );
}
