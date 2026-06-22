import { motion } from "framer-motion";

/**
 * Scroll-reveal wrapper. Fades + slides up as element enters viewport.
 * Used exclusively on the Landing page sections.
 */
export default function Reveal({ children, delay = 0, className, y = 22 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
