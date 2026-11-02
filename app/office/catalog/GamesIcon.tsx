/**
 * The Games category's rail icon, drawn like the editor's own (see
 * categoryIcons.tsx): a table football from the side, in flat colours with a
 * soft ground shadow.
 */
export const GamesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden>
    <ellipse cx="20" cy="36" rx="14" ry="2.2" fill="#000" opacity="0.13" />
    {/* Rods with their handles, over the box */}
    <rect x="2" y="13" width="36" height="1.6" rx="0.8" fill="#b9bcc4" />
    <rect x="2" y="18" width="36" height="1.6" rx="0.8" fill="#b9bcc4" />
    <rect x="1" y="12" width="4" height="3.6" rx="1.2" fill="#3d4657" />
    <rect x="35" y="17" width="4" height="3.6" rx="1.2" fill="#3d4657" />
    {/* Players */}
    <rect x="12" y="10" width="2.6" height="6" rx="1" fill="#c9564f" />
    <rect x="25" y="10" width="2.6" height="6" rx="1" fill="#c9564f" />
    <rect x="16" y="15" width="2.6" height="6" rx="1" fill="#3f6a9a" />
    <rect x="22" y="15" width="2.6" height="6" rx="1" fill="#3f6a9a" />
    {/* Cabinet and legs */}
    <rect x="6" y="20" width="28" height="7" rx="1.5" fill="#a07b58" />
    <rect x="6" y="20" width="28" height="2" fill="#b5825a" />
    <rect x="8" y="27" width="3" height="8" rx="0.8" fill="#8f6a4a" />
    <rect x="29" y="27" width="3" height="8" rx="0.8" fill="#8f6a4a" />
  </svg>
)
