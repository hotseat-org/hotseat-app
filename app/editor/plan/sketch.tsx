import type { ReactNode } from "react"
import type { SceneObject } from "../types"
import { shade } from "./shapes"

/**
 * Furniture for the simple (top-down) view, drawn like a furnished floor
 * plan: each piece a small symbol in its own frame — metres, front = +Z, like
 * the 3D models, at their sizes — which the plan turns into place. A chair is
 * a seat, backrest and armrests on a star base; a sofa its arms, back and
 * cushions; a toilet its bowl and tank. Each also gives its silhouette, for
 * the soft shadow under it.
 */

/** Glass for windows, glass walls and doors, and shower screens. */
export const WINDOW_GLASS = "#bfe0ee"

export interface PieceState {
  /** Desks: someone sits here on the shown day (monitor on, chair pulled in). */
  occupied?: boolean
}

export interface PieceDrawing {
  /** The symbol, in the piece's own frame. */
  node: ReactNode
  /** Its outline, for the shadow (any fill: the plan paints it). */
  silhouette: ReactNode
  /** Its height (m): taller pieces are drawn over lower ones. */
  height: number
}

/** Collects one piece's shapes; `tone` recolours them (the plan mutes some). */
export class Sketch {
  readonly parts: ReactNode[] = []
  readonly outline: ReactNode[] = []
  constructor(private tone: (color: string) => string) {}

  private key() {
    return this.parts.length
  }

  rect(
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    color: string,
    cornerRadius = 0.04,
    edge = true
  ) {
    this.parts.push(
      <rect
        key={this.key()}
        x={Math.min(x0, x1)}
        y={Math.min(z0, z1)}
        width={Math.abs(x1 - x0)}
        height={Math.abs(z1 - z0)}
        rx={cornerRadius}
        fill={this.tone(color)}
        stroke={edge ? this.tone(shade(color, 0.78)) : undefined}
        strokeWidth={edge ? 0.018 : undefined}
      />
    )
  }
  circle(centreX: number, centreZ: number, radius: number, color: string, edge = true) {
    this.parts.push(
      <circle
        key={this.key()}
        cx={centreX}
        cy={centreZ}
        r={radius}
        fill={this.tone(color)}
        stroke={edge ? this.tone(shade(color, 0.78)) : undefined}
        strokeWidth={edge ? 0.018 : undefined}
      />
    )
  }
  ellipse(
    centreX: number,
    centreZ: number,
    radiusX: number,
    radiusZ: number,
    color: string,
    turn = 0,
    edge = true
  ) {
    this.parts.push(
      <ellipse
        key={this.key()}
        cx={centreX}
        cy={centreZ}
        rx={radiusX}
        ry={radiusZ}
        transform={turn ? `rotate(${turn} ${centreX} ${centreZ})` : undefined}
        fill={this.tone(color)}
        stroke={edge ? this.tone(shade(color, 0.8)) : undefined}
        strokeWidth={edge ? 0.015 : undefined}
      />
    )
  }
  line(x0: number, z0: number, x1: number, z1: number, color: string, width = 0.02) {
    this.parts.push(
      <line
        key={this.key()}
        x1={x0}
        y1={z0}
        x2={x1}
        y2={z1}
        stroke={this.tone(color)}
        strokeWidth={width}
        strokeLinecap="round"
      />
    )
  }
  ring(centreX: number, centreZ: number, radius: number, color: string, width = 0.03) {
    this.parts.push(
      <circle
        key={this.key()}
        cx={centreX}
        cy={centreZ}
        r={radius}
        fill="none"
        stroke={this.tone(color)}
        strokeWidth={width}
      />
    )
  }
  /** Parts drawn by `draw`, turned about a point (a chair facing the other way). */
  turned(centreX: number, centreZ: number, degrees: number, draw: () => void) {
    const start = this.parts.length
    draw()
    const inner = this.parts.splice(start)
    this.parts.push(
      <g key={this.key()} transform={`rotate(${degrees} ${centreX} ${centreZ})`}>
        {inner}
      </g>
    )
  }

  shadowRect(x0: number, z0: number, x1: number, z1: number, cornerRadius = 0.06) {
    this.outline.push(
      <rect
        key={this.outline.length}
        x={x0}
        y={z0}
        width={x1 - x0}
        height={z1 - z0}
        rx={cornerRadius}
      />
    )
  }
  shadowCircle(centreX: number, centreZ: number, radius: number) {
    this.outline.push(<circle key={this.outline.length} cx={centreX} cy={centreZ} r={radius} />)
  }

  done(height: number): PieceDrawing {
    return { node: <>{this.parts}</>, silhouette: <>{this.outline}</>, height }
  }
}

/** What a kind's symbol is drawn with. */
export interface SymbolContext {
  sketch: Sketch
  object: SceneObject
  /** Its colour: its own, else its kind's. */
  color: string
  /** Half its footprint (m), before turning. */
  halfX: number
  halfZ: number
  /** Desks: lived-in (monitor on) — unless known free on the shown day. */
  isOn: boolean
  state: PieceState
}

/** Draws one kind's top-down symbol, in its own frame (front = +Z). */
export type DrawSymbol = (context: SymbolContext) => PieceDrawing
