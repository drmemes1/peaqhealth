"use client"

/**
 * OraviMark — renders the oravi wordmark image, cropped to its visible
 * band and blended into whatever background it sits on.
 *
 * The source asset (/oravi.png, 1024×1024) has the wordmark centered
 * inside generous whitespace. We use a fixed-aspect viewport that clips
 * the whitespace away and an image scaled so the wordmark fills the
 * viewport. mix-blend-mode multiplies the white background out so the
 * mark sits cleanly on cream / paper / dark surfaces.
 *
 * Pass `height` (px) to size the mark; width is derived from the
 * wordmark's natural aspect ratio.
 *
 * Use `blend="multiply"` (default) on light surfaces and
 * `blend="screen"` on dark surfaces. `blend="normal"` keeps the source
 * untouched if you've supplied a transparent variant of the asset.
 */
export function OraviMark({
  height = 32,
  blend = "multiply",
  src = "/oravi.png",
  alt = "Oravi",
}: {
  height?: number
  blend?: "multiply" | "screen" | "normal"
  src?: string
  alt?: string
}) {
  // Wordmark band in the source: ~62 % wide × ~16 % tall, centered.
  // To make that band fill an h-tall viewport, we scale the source so
  // the band's height equals `height`. Because the source is square,
  // the same uniform scale is used in both axes.
  const sourceBandHeightFraction = 0.16
  const sourceBandWidthFraction = 0.62
  const scaledSize = height / sourceBandHeightFraction
  const viewportWidth = scaledSize * sourceBandWidthFraction
  const viewportHeight = height

  return (
    <span
      role="img"
      aria-label={alt}
      style={{
        display: "inline-block",
        width: viewportWidth,
        height: viewportHeight,
        position: "relative",
        overflow: "hidden",
        verticalAlign: "middle",
      }}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          width: scaledSize,
          height: scaledSize,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          mixBlendMode: blend === "normal" ? undefined : blend,
          maxWidth: "none",
          pointerEvents: "none",
        }}
      />
    </span>
  )
}

export default OraviMark
