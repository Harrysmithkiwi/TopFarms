// The v12 landing world is illustrated, and this file IS that illustration.
//
// Why authored SVG rather than raster art or stock photography:
//   * The repo shipped ZERO image assets before this commit (one favicon). The comp needs
//     roughly eight illustrated scenes; commissioning them is weeks, and stock photographs
//     are the wrong medium — the comp is painted, and a photo dropped into a painted layout
//     reads as a mistake rather than a choice.
//   * PRODUCT.md's accessibility note is load-bearing here: many seekers are "on older
//     Android devices on rural-NZ data". This whole scene is a few kB of gzipped markup and
//     is resolution-independent, where the comp's fidelity in raster would be ~400kB before
//     you reach a 2x asset.
//   * It is themeable. Every green below is drawn from the fern ramp in index.css, so the
//     scene and the interface are the same world rather than a picture pasted onto one.
//
// The scene is DECORATIVE: every fact the page asserts lives in text beside it, and each
// <svg> carries aria-hidden. A screen reader loses nothing by never seeing this.
//
// Deterministic by construction — no Math.random anywhere, because a scene that reshuffles
// between SSR and hydration flashes on every load.

type SceneProps = {
  /** Extra classes for the positioning wrapper. */
  className?: string
}

/* Depth is carried by four things at once, which is what stops layered-hill SVG reading as
   flat bunting: value (each range lighter as it recedes), saturation (the far range is
   nearly grey-green), atmosphere (a haze wash between ranges) and detail (only the near
   pasture gets fence posts and animals). */
const RANGE = {
  far: '#a8c4b4',
  mid: '#7fae7c',
  near: '#5e9560',
  pasture: '#77b158',
  fore: '#578f42',
} as const

const TREE_DARK = '#3d6b44'
const TREE_MID = '#4a7c50'

/** One cloud, built from overlapping ellipses so the silhouette is lumpy rather than oval. */
function Cloud({ x, y, s, o }: { x: number; y: number; s: number; o: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <ellipse cx="0" cy="0" rx="56" ry="20" fill="#fff" />
      <ellipse cx="-34" cy="6" rx="34" ry="14" fill="#fff" />
      <ellipse cx="30" cy="7" rx="40" ry="15" fill="#fff" />
      <ellipse cx="-8" cy="-13" rx="30" ry="18" fill="#fff" />
      <ellipse cx="20" cy="-9" rx="22" ry="14" fill="#fff" />
    </g>
  )
}

/** Fresian: white body, black patches, head down grazing. Reads at 40px wide. */
function Cow({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0 0h44a6 6 0 016 6v13a5 5 0 01-5 5H5a5 5 0 01-5-5V6a6 6 0 016-6z" fill="#f4f3ee" />
      <path d="M8 0h13c3 6 1 13-3 17-5 1-9-2-10-6-1-5 0-9 0-11z" fill="#2c2c2c" />
      <path d="M33 2c6 0 11 3 12 8 1 4-2 8-6 9-5 1-9-3-9-8 0-4 1-7 3-9z" fill="#2c2c2c" />
      <path d="M48 4l7-3c3-1 6 1 6 4 0 2-1 4-3 5l-4 2z" fill="#2c2c2c" />
      <rect x="6" y="22" width="4" height="10" rx="2" fill="#2c2c2c" />
      <rect x="18" y="22" width="4" height="10" rx="2" fill="#2c2c2c" />
      <rect x="32" y="22" width="4" height="10" rx="2" fill="#2c2c2c" />
      <rect x="42" y="22" width="4" height="10" rx="2" fill="#2c2c2c" />
    </g>
  )
}

/** Romney: cream fleece, dark face and legs. */
function Sheep({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="15" cy="9" rx="15" ry="9" fill="#f2f0e6" />
      <circle cx="4" cy="6" r="6" fill="#f2f0e6" />
      <circle cx="24" cy="4" r="5" fill="#f2f0e6" />
      <ellipse cx="29" cy="9" rx="5" ry="4" fill="#4a4640" />
      <rect x="7" y="16" width="3" height="7" rx="1.5" fill="#4a4640" />
      <rect x="19" y="16" width="3" height="7" rx="1.5" fill="#4a4640" />
    </g>
  )
}

/** Macrocarpa shelter tree — the NZ farm boundary tree, not a generic lollipop. */
function Tree({ x, y, s = 1, dark = false }: { x: number; y: number; s?: number; dark?: boolean }) {
  const c = dark ? TREE_DARK : TREE_MID
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="16" y="34" width="6" height="18" fill="#5d5140" />
      <ellipse cx="19" cy="26" rx="22" ry="17" fill={c} />
      <ellipse cx="7" cy="32" rx="14" ry="11" fill={c} />
      <ellipse cx="31" cy="31" rx="15" ry="12" fill={c} />
      <ellipse cx="19" cy="16" rx="15" ry="11" fill={c} />
    </g>
  )
}

/** Post-and-wire, the fence every NZ paddock actually has. */
function Fence({ x, y, w, s = 1 }: { x: number; y: number; w: number; s?: number }) {
  const posts = Math.max(2, Math.round(w / 46))
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke="#6d5c46" fill="none">
      <line x1="0" y1="6" x2={w} y2="6" strokeWidth="1.5" opacity="0.85" />
      <line x1="0" y1="13" x2={w} y2="13" strokeWidth="1.5" opacity="0.85" />
      <line x1="0" y1="20" x2={w} y2="20" strokeWidth="1.5" opacity="0.85" />
      {Array.from({ length: posts + 1 }, (_, i) => (
        <rect
          key={i}
          x={(i * w) / posts - 2}
          y="0"
          width="4"
          height="28"
          rx="1"
          fill="#6d5c46"
          stroke="none"
        />
      ))}
    </g>
  )
}

/** Woolshed: long gable, lean-to, corrugated roof. */
function Woolshed({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 22L46 0l46 22v46H0z" fill="#9a8f7c" />
      <path d="M0 22L46 0l46 22z" fill="#6f6353" />
      <rect x="92" y="40" width="34" height="28" fill="#8a8071" />
      <path d="M92 40h34l-8-9H92z" fill="#6f6353" />
      <rect x="34" y="42" width="24" height="26" fill="#544b3e" />
      <rect x="14" y="34" width="10" height="10" fill="#544b3e" />
      <rect x="68" y="34" width="10" height="10" fill="#544b3e" />
    </g>
  )
}

/**
 * Two farmers, backs to the viewer, looking over the paddock — the comp's focal pair.
 * Backs deliberately: the page is about the farm, not about selling a face, and it dodges
 * the "smiling-farmer-with-arms-crossed stock photo" cliché PRODUCT.md names as an
 * anti-reference. It is also the honest option — these are nobody, and a rendered front-on
 * face would imply a real person endorsing the product.
 */
function Farmers({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* left figure */}
      <g>
        <rect x="10" y="52" width="11" height="46" rx="3" fill="#5c4a33" />
        <rect x="23" y="52" width="11" height="46" rx="3" fill="#5c4a33" />
        <path d="M8 14h28a6 6 0 016 6v30a4 4 0 01-4 4H6a4 4 0 01-4-4V20a6 6 0 016-6z" fill="#3f5c46" />
        <rect x="0" y="20" width="7" height="26" rx="3.5" fill="#3f5c46" />
        <rect x="37" y="20" width="7" height="26" rx="3.5" fill="#3f5c46" />
        <circle cx="22" cy="8" r="8" fill="#c99b6e" />
        <path d="M12 6a10 10 0 0120 0v2H12z" fill="#2f4a38" />
        <path d="M30 5h11a2 2 0 010 4H30z" fill="#2f4a38" />
      </g>
      {/* right figure, half a step back */}
      <g transform="translate(52 6)">
        <rect x="10" y="50" width="10" height="44" rx="3" fill="#6b5a44" />
        <rect x="22" y="50" width="10" height="44" rx="3" fill="#6b5a44" />
        <path d="M8 14h26a6 6 0 016 6v28a4 4 0 01-4 4H6a4 4 0 01-4-4V20a6 6 0 016-6z" fill="#35506b" />
        <rect x="0" y="20" width="7" height="24" rx="3.5" fill="#35506b" />
        <rect x="35" y="20" width="7" height="24" rx="3.5" fill="#35506b" />
        <circle cx="21" cy="8" r="7.5" fill="#e0b083" />
        <path d="M13 9a8 8 0 0116 0c0 3-4 5-8 5s-8-2-8-5z" fill="#8a6a3f" />
      </g>
    </g>
  )
}

/**
 * The hero scene. Full-bleed behind the headline; `slice` so it crops rather than letterboxes
 * at any aspect. The top third is deliberately quiet sky — that is where the headline sits,
 * and the type needs a calm ground to hold 11:1 contrast against.
 */
export function PastoralHero({ className = '' }: SceneProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 1440 780"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="v12-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c3dcea" />
          <stop offset="46%" stopColor="#dceae7" />
          <stop offset="100%" stopColor="#eaf1e0" />
        </linearGradient>
        <linearGradient id="v12-pasture" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={RANGE.pasture} />
          <stop offset="100%" stopColor={RANGE.fore} />
        </linearGradient>
        {/* Haze: how a far range reads as far rather than as a paler shape. */}
        <linearGradient id="v12-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="1440" height="780" fill="url(#v12-sky)" />

      <g>
        <Cloud x={190} y={112} s={1.5} o={0.85} />
        <Cloud x={620} y={70} s={1.05} o={0.6} />
        <Cloud x={1100} y={128} s={1.7} o={0.8} />
        <Cloud x={1340} y={62} s={1} o={0.5} />
      </g>

      {/* far range */}
      <path
        d="M0 372c150-46 268-16 372 8s196 26 300-4 214-58 340-30 268 40 428 6v78H0z"
        fill={RANGE.far}
      />
      <path
        d="M0 372c150-46 268-16 372 8s196 26 300-4 214-58 340-30 268 40 428 6v78H0z"
        fill="url(#v12-haze)"
      />

      {/* mid range */}
      <path
        d="M0 452c186-58 300-22 430 10s232 30 358-6 232-52 366-14 190 44 286 22v92H0z"
        fill={RANGE.mid}
      />
      <g opacity="0.5">
        <Tree x={214} y={396} s={0.7} dark />
        <Tree x={996} y={382} s={0.62} dark />
      </g>

      {/* near range */}
      <path
        d="M0 540c220-64 352-20 502 14s258 24 392-14 244-40 372-6 128 34 174 28v218H0z"
        fill={RANGE.near}
      />

      {/* pasture — the plane everything real stands on */}
      <path
        d="M0 620c260-52 430-6 610 24s324 22 470-12 250-32 360-4v152H0z"
        fill="url(#v12-pasture)"
      />

      {/* shelter belt + woolshed on the right, as in the comp */}
      <Tree x={1146} y={476} s={1.28} />
      <Tree x={1252} y={500} s={1.02} dark />
      <Woolshed x={1258} y={548} s={0.95} />

      {/* fence line leading the eye left to right */}
      <Fence x={-10} y={620} w={540} s={0.98} />
      <Fence x={868} y={612} w={352} s={0.92} />

      {/* stock: cows left, sheep centre — grouped and unevenly spaced, because an even row
          reads as wallpaper rather than as a mob */}
      <Cow x={72} y={628} s={1.16} />
      <Cow x={158} y={652} s={1.1} flip />
      <Cow x={228} y={624} s={1.0} />
      <Cow x={300} y={656} s={1.12} />
      <Sheep x={486} y={664} s={1.12} />
      <Sheep x={566} y={678} s={1.04} />
      <Sheep x={648} y={668} s={1.08} />
      <Sheep x={726} y={682} s={1.0} />

      <Farmers x={946} y={520} s={1.62} />

      {/* foreground grass, slightly darker, to seat the whole scene */}
      <path d="M0 742c240-30 470 10 700 18s500-6 740-34v54H0z" fill="#4d7f39" opacity="0.6" />
    </svg>
  )
}

/**
 * The band scene — same world, shorter horizon, no figures. Used behind the mid-page banner
 * and the closing CTA, where type sits on top and the scene must not compete.
 */
export function PastoralBand({ className = '' }: SceneProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 1440 340"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="v12-band-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cfe3ee" />
          <stop offset="100%" stopColor="#e7f0e2" />
        </linearGradient>
      </defs>
      <rect width="1440" height="340" fill="url(#v12-band-sky)" />
      <Cloud x={320} y={54} s={1.2} o={0.7} />
      <Cloud x={1080} y={44} s={1.4} o={0.6} />
      <path d="M0 154c190-40 320-6 470 20s268 18 404-10 224-30 346-8 150 26 220 18v166H0z" fill={RANGE.mid} />
      <path d="M0 210c230-46 372-8 530 20s282 16 420-14 236-26 348-2 96 22 142 18v108H0z" fill={RANGE.near} />
      <path d="M0 262c260-40 430 0 612 22s320 14 462-10 240-22 366 0v66H0z" fill={RANGE.pasture} />
      <Tree x={1180} y={196} s={0.9} />
      <Fence x={-10} y={278} w={420} s={0.78} />
      <Sheep x={620} y={302} s={0.9} />
      <Sheep x={692} y={310} s={0.86} />
      <Cow x={900} y={288} s={0.86} />
      <Cow x={982} y={302} s={0.8} flip />
    </svg>
  )
}

/**
 * A small vignette for the two info cards and the split cards — the comp bleeds a scene off
 * the right edge of each, fading into the card surface. Kept simpler than the hero on
 * purpose: it sits behind body copy at a third of the size.
 */
export function PastoralVignette({
  variant = 'paddock',
  className = '',
}: SceneProps & { variant?: 'paddock' | 'gate' | 'shed' | 'track' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="320" height="220" fill="#dfeae0" />
      <path d="M0 96c56-22 96-4 140 10s78 8 112-8 46-14 68-4v126H0z" fill={RANGE.mid} />
      <path d="M0 138c62-24 108-2 158 14s84 6 124-12 30-8 38-6v86H0z" fill={RANGE.near} />
      <path d="M0 172c70-20 128 4 190 16s96 2 130-8v40H0z" fill={RANGE.pasture} />
      {variant === 'paddock' && (
        <>
          <Tree x={196} y={92} s={0.85} />
          <Sheep x={64} y={186} s={0.8} />
          <Sheep x={116} y={194} s={0.74} />
        </>
      )}
      {variant === 'gate' && (
        <>
          <Fence x={-6} y={168} w={330} s={0.85} />
          <Tree x={238} y={100} s={0.7} dark />
        </>
      )}
      {variant === 'shed' && (
        <>
          <Woolshed x={150} y={116} s={0.72} />
          <Tree x={40} y={110} s={0.72} />
        </>
      )}
      {variant === 'track' && (
        <>
          <path d="M150 220c6-40 18-64 38-84" stroke="#c9bb96" strokeWidth="16" fill="none" opacity="0.7" />
          <Tree x={40} y={104} s={0.78} />
          <Cow x={210} y={182} s={0.72} />
        </>
      )}
    </svg>
  )
}
