"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useInView } from "framer-motion";

export function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
}: {
  target: string;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(prefix + "0" + suffix);

  const num = useMemo(() => {
    const numericPart = target.replace(/[^0-9.]/g, "");
    return parseFloat(numericPart);
  }, [target]);

  useEffect(() => {
    if (!inView) return;
    if (isNaN(num)) return;

    const duration = 1500;
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;
    const increment = num / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= num) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(prefix + Math.floor(current).toString() + suffix);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [inView, num, target, prefix, suffix]);

  return <span ref={ref}>{isNaN(num) ? target : display}</span>;
}
