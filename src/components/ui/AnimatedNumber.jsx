import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

/**
 * Smoothly counts to `value` on every change using a spring.
 * Pass `decimals` to control precision. The component renders a
 * `motion.span` so it can be nested inside any text.
 */
export default function AnimatedNumber({ value, decimals = 1, className = "" }) {
  const spring = useSpring(value, { stiffness: 55, damping: 14, mass: 0.8 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={className}>{display}</motion.span>;
}
