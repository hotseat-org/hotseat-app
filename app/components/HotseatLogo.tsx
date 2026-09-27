import { type FC, useMemo } from "react"
import { useTheme, Theme } from "remix-themes"

/* ------------------------------------------------------------------ */
/*  Theme tokens                                                       */
/* ------------------------------------------------------------------ */

interface ThemeTokens {
  readonly bgGradient: string
  readonly borderColor: string
  readonly outerShadow: string
  readonly innerShadow: string
  readonly ringGradient: string
  readonly textColor: string
  readonly chromeGradient: string
  readonly chromeOpacity: number
  readonly vignetteShadow: string
  readonly heatGlow: string
  readonly flameStroke1: string
  readonly flameStroke2: string
  readonly flameStroke3: string
  readonly flameGlow1: string
  readonly flameGlow2: string
  readonly flameGlow3: string
  readonly starOpacity: number
  readonly emberColors: readonly string[]
  readonly firePulse: string
}

const darkTokens: ThemeTokens = {
  bgGradient: "radial-gradient(ellipse at 50% 65%, #1a0820 0%, #0a0a14 65%)",
  borderColor: "rgba(255,45,124,0.3)",
  outerShadow: "0 0 30px rgba(255,45,124,0.3), 0 0 60px rgba(161,29,255,0.15)",
  innerShadow: "inset 0 0 50px rgba(0,0,0,0.5)",
  ringGradient:
    "conic-gradient(from 0deg, rgba(255,45,124,0.45), rgba(161,29,255,0.4), rgba(255,107,43,0.35), rgba(0,255,255,0.2), rgba(255,45,124,0.45))",
  textColor: "#fff",
  chromeGradient:
    "linear-gradient(180deg, #fff 0%, #ff8fd8 20%, #ffe259 40%, #ff6b2b 60%, #ff2d7c 80%, #a11dff 100%)",
  chromeOpacity: 0.65,
  vignetteShadow: "inset 0 0 90px rgba(0,0,0,0.55)",
  heatGlow:
    "radial-gradient(ellipse, rgba(255,45,124,0.15) 0%, rgba(161,29,255,0.06) 50%, transparent 70%)",
  flameStroke1: "rgba(255,45,124,0.8)",
  flameStroke2: "rgba(161,29,255,0.6)",
  flameStroke3: "rgba(0,230,255,0.35)",
  flameGlow1:
    "drop-shadow(0 0 8px rgba(255,45,124,0.7)) drop-shadow(0 0 20px rgba(255,45,124,0.3))",
  flameGlow2:
    "drop-shadow(0 0 6px rgba(161,29,255,0.6)) drop-shadow(0 0 16px rgba(161,29,255,0.2))",
  flameGlow3: "drop-shadow(0 0 5px rgba(0,230,255,0.4)) drop-shadow(0 0 12px rgba(0,230,255,0.15))",
  starOpacity: 1,
  emberColors: [
    "#ff2d7c",
    "#ff6b2b",
    "#a11dff",
    "#00e6ff",
    "#ffe259",
    "#ff2d7c",
    "#ff6b2b",
    "#a11dff",
    "#00e6ff",
    "#ffe259",
    "#ff2d7c",
    "#ff6b2b",
  ],
  firePulse: `
    0% {
      text-shadow: 0 0 8px rgba(255,45,124,0.8), 0 0 18px rgba(255,45,124,0.55), 0 0 36px rgba(255,45,124,0.35), 0 0 70px rgba(161,29,255,0.25), 0 2px 0 rgba(255,107,43,0.7);
      filter: brightness(1);
    }
    50% {
      text-shadow: 0 0 12px rgba(255,45,124,1), 0 0 25px rgba(255,45,124,0.75), 0 0 50px rgba(255,45,124,0.45), 0 0 90px rgba(161,29,255,0.35), 0 2px 0 rgba(255,107,43,1);
      filter: brightness(1.15);
    }
    100% {
      text-shadow: 0 0 10px rgba(255,45,124,0.9), 0 0 20px rgba(255,45,124,0.65), 0 0 42px rgba(255,45,124,0.4), 0 0 80px rgba(161,29,255,0.3), 0 2px 0 rgba(255,107,43,0.85);
      filter: brightness(1.08);
    }`,
}

const lightTokens: ThemeTokens = {
  bgGradient: "radial-gradient(ellipse at 50% 65%, #fff0e8 0%, #fef5f0 65%)",
  borderColor: "rgba(220,80,60,0.25)",
  outerShadow: "0 0 20px rgba(220,80,60,0.2), 0 0 40px rgba(180,40,120,0.1)",
  innerShadow: "inset 0 0 40px rgba(255,245,240,0.5)",
  ringGradient:
    "conic-gradient(from 0deg, rgba(220,80,60,0.3), rgba(180,40,120,0.25), rgba(220,120,30,0.2), rgba(100,180,200,0.15), rgba(220,80,60,0.3))",
  textColor: "#7c1d3e",
  chromeGradient:
    "linear-gradient(180deg, #fef3c7 0%, #f59e0b 20%, #ea580c 45%, #dc2626 65%, #991b5e 85%, #450a2e 100%)",
  chromeOpacity: 0.4,
  vignetteShadow: "inset 0 0 80px rgba(254,245,240,0.5)",
  heatGlow:
    "radial-gradient(ellipse, rgba(220,80,60,0.1) 0%, rgba(180,40,120,0.04) 50%, transparent 70%)",
  flameStroke1: "rgba(200,50,80,0.5)",
  flameStroke2: "rgba(140,30,100,0.35)",
  flameStroke3: "rgba(60,150,170,0.2)",
  flameGlow1:
    "drop-shadow(0 0 5px rgba(200,50,80,0.35)) drop-shadow(0 0 12px rgba(200,50,80,0.15))",
  flameGlow2:
    "drop-shadow(0 0 4px rgba(140,30,100,0.3)) drop-shadow(0 0 10px rgba(140,30,100,0.1))",
  flameGlow3:
    "drop-shadow(0 0 3px rgba(60,150,170,0.2)) drop-shadow(0 0 8px rgba(60,150,170,0.08))",
  starOpacity: 0.25,
  emberColors: [
    "#d4400a",
    "#cc7020",
    "#991b5e",
    "#4a9aaa",
    "#ccaa00",
    "#d4400a",
    "#cc7020",
    "#991b5e",
    "#4a9aaa",
    "#ccaa00",
    "#d4400a",
    "#cc7020",
  ],
  firePulse: `
    0% {
      text-shadow: 0 0 4px rgba(200,50,80,0.5), 0 0 10px rgba(200,50,80,0.35), 0 0 20px rgba(180,40,80,0.2), 0 0 40px rgba(140,30,100,0.12), 0 2px 0 rgba(200,80,40,0.3);
      filter: brightness(1);
    }
    50% {
      text-shadow: 0 0 6px rgba(200,50,80,0.6), 0 0 14px rgba(200,50,80,0.45), 0 0 28px rgba(180,40,80,0.28), 0 0 50px rgba(140,30,100,0.16), 0 2px 0 rgba(200,80,40,0.4);
      filter: brightness(1.05);
    }
    100% {
      text-shadow: 0 0 5px rgba(200,50,80,0.55), 0 0 12px rgba(200,50,80,0.4), 0 0 24px rgba(180,40,80,0.24), 0 0 45px rgba(140,30,100,0.14), 0 2px 0 rgba(200,80,40,0.35);
      filter: brightness(1.02);
    }`,
}

/* ------------------------------------------------------------------ */
/*  Ember particles                                                    */
/* ------------------------------------------------------------------ */

interface EmberConfig {
  readonly left: string
  readonly bottom: number
  readonly size: number
  readonly duration: string
  readonly delay: string
  readonly drift: string
  readonly blur: string
}

const EMBER_CONFIG: readonly EmberConfig[] = [
  {
    left: "30%",
    bottom: 80,
    size: 3,
    duration: "2.8s",
    delay: "0s",
    drift: "-20px",
    blur: "0.5px",
  },
  {
    left: "55%",
    bottom: 70,
    size: 2,
    duration: "3.2s",
    delay: "0.4s",
    drift: "15px",
    blur: "0.5px",
  },
  {
    left: "42%",
    bottom: 90,
    size: 4,
    duration: "2.5s",
    delay: "0.8s",
    drift: "-10px",
    blur: "1px",
  },
  {
    left: "65%",
    bottom: 75,
    size: 2,
    duration: "3.5s",
    delay: "1.2s",
    drift: "25px",
    blur: "0.5px",
  },
  {
    left: "25%",
    bottom: 85,
    size: 3,
    duration: "2.9s",
    delay: "0.2s",
    drift: "-30px",
    blur: "0.5px",
  },
  { left: "72%", bottom: 65, size: 2, duration: "3.1s", delay: "1.6s", drift: "12px", blur: "1px" },
  {
    left: "48%",
    bottom: 95,
    size: 3,
    duration: "2.6s",
    delay: "0.6s",
    drift: "-8px",
    blur: "0.5px",
  },
  {
    left: "35%",
    bottom: 70,
    size: 2,
    duration: "3.4s",
    delay: "2.0s",
    drift: "18px",
    blur: "0.5px",
  },
  {
    left: "58%",
    bottom: 88,
    size: 4,
    duration: "2.4s",
    delay: "1.0s",
    drift: "-22px",
    blur: "1px",
  },
  {
    left: "18%",
    bottom: 78,
    size: 2,
    duration: "3.0s",
    delay: "1.4s",
    drift: "10px",
    blur: "0.5px",
  },
  {
    left: "78%",
    bottom: 82,
    size: 3,
    duration: "2.7s",
    delay: "0.3s",
    drift: "-14px",
    blur: "0.5px",
  },
  { left: "50%", bottom: 62, size: 2, duration: "3.3s", delay: "1.8s", drift: "20px", blur: "1px" },
]

const Ember: FC<{ config: EmberConfig; color: string }> = ({ config, color }) => (
  <div
    style={
      {
        position: "absolute",
        borderRadius: "50%",
        opacity: 0,
        left: config.left,
        bottom: config.bottom,
        width: config.size,
        height: config.size,
        backgroundColor: color,
        filter: `blur(${config.blur})`,
        animation: `hotseat-rise ${config.duration} linear infinite`,
        animationDelay: config.delay,
        "--drift": config.drift,
      } as React.CSSProperties
    }
  />
)

/* ------------------------------------------------------------------ */
/*  Retrowave flame SVGs                                               */
/* ------------------------------------------------------------------ */

const FlameSVG: FC<{ tokens: ThemeTokens; size: number }> = ({ tokens, size }) => (
  <div
    style={{
      position: "absolute",
      bottom: -2,
      left: 0,
      width: size,
      height: size * 0.6,
      zIndex: 1,
      overflow: "hidden",
    }}
  >
    {/* Layer 3 — outermost */}
    <svg
      viewBox="0 0 320 200"
      style={{
        position: "absolute",
        bottom: -10,
        left: "-10%",
        width: "120%",
        height: "100%",
        filter: tokens.flameGlow3,
        animation: "hotseat-flameSway3 4s ease-in-out infinite alternate",
      }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="flame3" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="rgba(255,107,43,0.3)" />
          <stop offset="50%" stopColor="rgba(161,29,255,0.2)" />
          <stop offset="100%" stopColor="rgba(0,230,255,0.02)" />
        </linearGradient>
      </defs>
      <path
        d="M-10,200 L-10,140 C10,130 20,100 40,95 C55,91 60,110 80,90 C95,75 100,60 120,55 C135,51 140,70 160,45 C175,25 180,50 200,55 C215,59 220,40 240,65 C255,85 260,75 280,90 C295,102 300,85 320,110 C335,130 330,140 330,200 Z"
        fill="url(#flame3)"
        stroke={tokens.flameStroke3}
        strokeWidth="1"
      />
    </svg>

    {/* Layer 2 — middle */}
    <svg
      viewBox="0 0 320 200"
      style={{
        position: "absolute",
        bottom: -10,
        left: "-5%",
        width: "110%",
        height: "90%",
        filter: tokens.flameGlow2,
        animation: "hotseat-flameSway2 3.5s ease-in-out infinite alternate",
      }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="flame2" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="rgba(255,170,30,0.5)" />
          <stop offset="50%" stopColor="rgba(255,45,124,0.3)" />
          <stop offset="100%" stopColor="rgba(161,29,255,0.05)" />
        </linearGradient>
      </defs>
      <path
        d="M-10,200 L-10,155 C20,145 30,120 55,110 C70,104 80,125 100,100 C115,80 120,70 145,60 C158,55 165,80 180,65 C195,52 200,70 220,80 C240,88 245,75 265,100 C280,120 290,110 320,140 C330,150 330,200 330,200 Z"
        fill="url(#flame2)"
        stroke={tokens.flameStroke2}
        strokeWidth="1.2"
      />
    </svg>

    {/* Layer 1 — innermost, brightest */}
    <svg
      viewBox="0 0 320 200"
      style={{
        position: "absolute",
        bottom: -10,
        left: "0%",
        width: "100%",
        height: "80%",
        filter: tokens.flameGlow1,
        animation: "hotseat-flameSway1 3s ease-in-out infinite alternate",
      }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="flame1" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="rgba(255,220,60,0.7)" />
          <stop offset="40%" stopColor="rgba(255,107,43,0.45)" />
          <stop offset="70%" stopColor="rgba(255,45,124,0.2)" />
          <stop offset="100%" stopColor="rgba(161,29,255,0.02)" />
        </linearGradient>
      </defs>
      <path
        d="M-10,200 L-10,165 C25,158 40,140 65,130 C80,124 90,145 110,120 C125,100 135,90 155,80 C168,74 172,95 185,85 C200,73 208,92 225,100 C245,110 255,95 275,120 C290,140 300,130 320,155 C330,165 330,200 330,200 Z"
        fill="url(#flame1)"
        stroke={tokens.flameStroke1}
        strokeWidth="1.5"
      />
    </svg>
  </div>
)

/* ------------------------------------------------------------------ */
/*  Stars                                                              */
/* ------------------------------------------------------------------ */

const Stars: FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      opacity,
      background: [
        "radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,0.6), transparent)",
        "radial-gradient(1px 1px at 28% 35%, rgba(255,255,255,0.35), transparent)",
        "radial-gradient(1.2px 1.2px at 52% 12%, rgba(255,255,255,0.6), transparent)",
        "radial-gradient(1px 1px at 72% 25%, rgba(255,255,255,0.3), transparent)",
        "radial-gradient(1px 1px at 88% 18%, rgba(255,255,255,0.45), transparent)",
        "radial-gradient(1px 1px at 18% 48%, rgba(255,255,255,0.25), transparent)",
        "radial-gradient(1px 1px at 42% 42%, rgba(255,255,255,0.35), transparent)",
        "radial-gradient(1px 1px at 92% 38%, rgba(255,255,255,0.4), transparent)",
        "radial-gradient(1px 1px at 62% 8%, rgba(255,255,255,0.5), transparent)",
        "radial-gradient(1px 1px at 8% 30%, rgba(255,255,255,0.3), transparent)",
      ].join(","),
    }}
  />
)

/* ------------------------------------------------------------------ */
/*  Keyframes                                                          */
/* ------------------------------------------------------------------ */

const buildStyles = (tokens: ThemeTokens): string => `
  @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');

  @keyframes hotseat-rise {
    0%   { opacity: 0; transform: translateY(0) scale(1); }
    10%  { opacity: 1; }
    60%  { opacity: 0.8; }
    100% { opacity: 0; transform: translateY(-260px) scale(0.2) translateX(var(--drift)); }
  }
  @keyframes hotseat-heatPulse {
    0%   { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 1;   transform: translate(-50%, -50%) scale(1.1); }
  }
  @keyframes hotseat-firePulse { ${tokens.firePulse} }
  @keyframes hotseat-ringRotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes hotseat-flameSway1 {
    0%   { transform: scaleX(1) scaleY(1) translateX(0) skewX(0deg); }
    30%  { transform: scaleX(1.06) scaleY(0.95) translateX(6px) skewX(2deg); }
    70%  { transform: scaleX(0.95) scaleY(1.06) translateX(-4px) skewX(-1.5deg); }
    100% { transform: scaleX(1.08) scaleY(0.97) translateX(8px) skewX(3deg); }
  }
  @keyframes hotseat-flameSway2 {
    0%   { transform: scaleX(1) scaleY(1) translateX(0) skewX(0deg); }
    25%  { transform: scaleX(0.94) scaleY(1.05) translateX(-8px) skewX(-2.5deg); }
    60%  { transform: scaleX(1.07) scaleY(0.96) translateX(5px) skewX(2deg); }
    100% { transform: scaleX(0.93) scaleY(1.04) translateX(-10px) skewX(-3deg); }
  }
  @keyframes hotseat-flameSway3 {
    0%   { transform: scaleX(1) scaleY(1) translateX(0) skewX(0deg); }
    35%  { transform: scaleX(1.09) scaleY(0.94) translateX(7px) skewX(1.5deg); }
    65%  { transform: scaleX(0.96) scaleY(1.07) translateX(-6px) skewX(-2deg); }
    100% { transform: scaleX(1.1) scaleY(0.95) translateX(5px) skewX(2.5deg); }
  }
`

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface HotseatLogoProps {
  size?: number
}

const HotseatLogo: FC<HotseatLogoProps> = ({ size = 320 }) => {
  const [theme] = useTheme()
  const isDark = theme !== Theme.LIGHT
  const tokens = isDark ? darkTokens : lightTokens
  const scale = size / 320
  const fontSize = 58 * scale
  const styles = useMemo(() => buildStyles(tokens), [tokens])

  return (
    <>
      <style>{styles}</style>
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: tokens.bgGradient,
          boxShadow: `${tokens.outerShadow}, ${tokens.innerShadow}`,
          border: `2px solid ${tokens.borderColor}`,
        }}
      >
        {/* Rotating ring glow */}
        <div
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            zIndex: -1,
            background: tokens.ringGradient,
            animation: "hotseat-ringRotate 6s linear infinite",
            filter: "blur(6px)",
          }}
        />

        <Stars opacity={tokens.starOpacity} />

        {/* Heat glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 220 * scale,
            height: 120 * scale,
            borderRadius: "50%",
            background: tokens.heatGlow,
            zIndex: 3,
            animation: "hotseat-heatPulse 2s ease-in-out infinite alternate",
          }}
        />

        {/* Embers */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4 }}>
          {EMBER_CONFIG.map((cfg, i) => (
            <Ember key={i} config={cfg} color={tokens.emberColors[i]} />
          ))}
        </div>

        {/* Retrowave flames */}
        <FlameSVG tokens={tokens} size={size} />

        {/* Title */}
        <span
          style={{
            position: "relative",
            zIndex: 10,
            fontFamily: "'Pacifico', cursive",
            fontSize,
            color: tokens.textColor,
            animation: "hotseat-firePulse 2s ease-in-out infinite alternate",
          }}
        >
          Hotseat
        </span>

        {/* Chrome overlay */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            zIndex: 11,
            fontFamily: "'Pacifico', cursive",
            fontSize,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: tokens.chromeGradient,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            opacity: tokens.chromeOpacity,
            mixBlendMode: "screen",
            pointerEvents: "none",
          }}
        >
          Hotseat
        </span>

        {/* Vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            pointerEvents: "none",
            zIndex: 15,
            boxShadow: tokens.vignetteShadow,
          }}
        />
      </div>
    </>
  )
}

export default HotseatLogo
