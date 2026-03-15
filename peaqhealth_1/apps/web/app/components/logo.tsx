"use client";
import Image from "next/image";

interface LogoProps {
  height?: number;
  dark?: boolean; // true = white logo (for dark backgrounds)
  className?: string;
  style?: React.CSSProperties;
}

export function Logo({ height = 28, dark = false, className, style }: LogoProps) {
  return (
    <Image
      src="/peaq.png"
      alt="peaq"
      height={height}
      width={Math.round(height * 2.85)} // logo is wider than square
      className={className}
      style={{
        height,
        width: "auto",
        filter: dark ? "brightness(0) invert(1)" : "brightness(0)",
        ...style,
      }}
      priority
    />
  );
}
