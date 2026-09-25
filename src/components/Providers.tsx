"use client";

import { MotionConfig } from "framer-motion";

/** reducedMotion="user": transforms are skipped when the OS asks for reduced motion. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
