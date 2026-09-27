/** Decorative warm glow for full-screen backgrounds (welcome, invite, etc.). */
export const AmbientGlow = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute left-[22%] top-[-8%] size-[420px] rounded-full bg-accent/10 blur-3xl" />
    <div className="absolute bottom-[-12%] right-[14%] size-[380px] rounded-full bg-warning/10 blur-3xl" />
  </div>
)
