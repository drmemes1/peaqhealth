import Image from "next/image";

interface LogoSvgProps {
  size?: number;
  color?: string;  // "white"/"#fff" signals dark background → invert the logo
  className?: string;
}

export function LogoSvg({
  size = 48,
  color = "#1a1a18",
  className,
}: LogoSvgProps) {
  const width = Math.round(size * (240 / 200));

  const onDarkBg =
    color.startsWith("rgba(250") ||
    color.startsWith("rgba(255") ||
    color === "white" ||
    color === "#fff" ||
    color === "#ffffff";

  return (
    <Image
      src="/images/peaq_logo_transparent.png"
      alt="Peaq Health"
      width={width}
      height={size}
      className={className}
      style={{
        objectFit: "contain",
        filter: onDarkBg ? "invert(1)" : undefined,
      }}
    />
  );
}
