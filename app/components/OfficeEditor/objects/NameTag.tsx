import { Html } from "@react-three/drei"

interface Props {
  text: string
  position: [number, number, number]
}

/** A small floating name label (billboarded DOM) above an object. */
export const NameTag = ({ text, position }: Props) => (
  <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
    <div
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        background: "rgba(15,23,42,0.82)",
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        userSelect: "none",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
      }}
    >
      {text}
    </div>
  </Html>
)
