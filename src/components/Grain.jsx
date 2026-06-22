/**
 * Subtle film-grain overlay applied across the entire app.
 * SVG turbulence noise at ~3% opacity with overlay blend mode —
 * invisible as a colour, only felt as texture.
 */
export default function Grain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[200]"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundRepeat: "repeat",
        backgroundSize: "200px 200px",
        opacity: 0.032,
        mixBlendMode: "overlay",
      }}
    />
  );
}
