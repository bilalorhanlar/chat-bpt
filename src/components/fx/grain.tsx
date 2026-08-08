/**
 * Statik film grenli doku.
 *
 * Tek karelik SVG gürültüsü döşenir; hiç animasyon yoktur, bu yüzden
 * bedeli sıfıra yakındır. Düz mor gradyanların "dijital" görünmesini kırar.
 */
const NOISE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
       <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" stitchTiles="stitch"/></filter>
       <rect width="160" height="160" filter="url(#n)"/>
     </svg>`,
  );

export function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-[0.035] mix-blend-multiply"
      style={{ backgroundImage: `url("${NOISE}")`, backgroundSize: "160px 160px" }}
    />
  );
}
