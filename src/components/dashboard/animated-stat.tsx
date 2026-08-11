"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useInView } from "framer-motion";

function getInitialDisplay(value: string | number): string {
  if (typeof value === "string") {
    const numericPart = value.replace(/[^0-9.]/g, "");
    const num = parseFloat(numericPart);
    if (isNaN(num)) return value;
  }
  return "0";
}

export function AnimatedStat({
  value,
  duration = 1200,
}: {
  value: string | number;
  duration?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(() => getInitialDisplay(value));

  const startAnimation = useCallback(() => {
    if (typeof value === "string") {
      const numericPart = value.replace(/[^0-9.]/g, "");
      const num = parseFloat(numericPart);
      if (isNaN(num)) return;
      const suffix = value.replace(numericPart, "");
      const hasDecimal = numericPart.includes(".");
      const steps = 30;
      const stepTime = duration / steps;
      let current = 0;
      const increment = num / steps;
      const timer = setInterval(() => {
        current += increment;
        if (current >= num) {
          setDisplay(value);
          clearInterval(timer);
        } else {
          const formatted = hasDecimal
            ? current.toFixed(1)
            : Math.floor(current).toString();
          setDisplay(formatted + suffix);
        }
      }, stepTime);
      return () => clearInterval(timer);
    } else {
      const steps = 30;
      const stepTime = duration / steps;
      let current = 0;
      const increment = value / steps;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplay(value.toString());
          clearInterval(timer);
        } else {
          setDisplay(Math.floor(current).toString());
        }
      }, stepTime);
      return () => clearInterval(timer);
    }
  }, [value, duration]);

  useEffect(() => {
    if (!inView) return;
    const cleanup = startAnimation();
    return cleanup;
  }, [inView, startAnimation]);

  return <span ref={ref}>{display}</span>;
}
