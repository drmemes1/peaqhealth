"use client";

import Image from "next/image";

interface LogoProps {
  height?: number;
  className?: string;
}

/**
 * Peaq logo — uses /peaq.png when available, falls back to text.
 * Replace public/peaq.png with the real logo file.
 */
export function Logo({ height = 28, className }: LogoProps) {
  return (
    <Image
      src="/peaq.png"
      alt="peaq"
      height={height}
      width={Math.round(height * 1)}
      className={className}
      style={{ height, width: "auto" }}
      priority
    />
  );
}
