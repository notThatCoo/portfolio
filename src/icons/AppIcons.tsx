import { useId, type SVGProps } from "react";
import type { AppId } from "@/lib/wm/types";

/**
 * Hand-drawn app icons. Every icon shares a 64×64 "tile" with a soft top
 * highlight; gradient ids come from useId() so the same icon can render in the
 * dock, palette, and home screen at once without id collisions.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Tile({
  colors: [from, to],
  children,
  ...props
}: IconProps & { colors: [string, string] }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" {...props}>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <linearGradient id={`${id}hl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${id}bg)`} />
      {children}
      <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${id}hl)`} />
      <rect
        x="2.5"
        y="2.5"
        width="59"
        height="59"
        rx="13.5"
        fill="none"
        stroke="#000"
        strokeOpacity="0.18"
      />
    </svg>
  );
}

export function NotesIcon(props: IconProps) {
  return (
    <Tile colors={["#FFE3A3", "#F2A93B"]} {...props}>
      <g transform="rotate(-6 32 34)">
        <rect x="15" y="13" width="34" height="40" rx="4" fill="#FFFDF7" />
        <rect x="15" y="13" width="34" height="8" rx="4" fill="#F6C453" />
        <path
          d="M21 28h22M21 34h22M21 40h15"
          stroke="#D9C9A3"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path d="M41 53l8-8v4a4 4 0 0 1-4 4z" fill="#EBDDBA" />
      </g>
    </Tile>
  );
}

export function FinderIcon(props: IconProps) {
  return (
    <Tile colors={["#34D6C2", "#0B6E8A"]} {...props}>
      <path d="M13 24a4 4 0 0 1 4-4h9l4 4h17a4 4 0 0 1 4 4v3H13z" fill="#C9FFF6" opacity="0.65" />
      <path
        d="M11 30a4 4 0 0 1 4-4h11l4 4h19a4 4 0 0 1 4 4v14a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5z"
        fill="#F2FFFD"
      />
      <path d="M21 42h22" stroke="#0E8A9A" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="47" cy="17" r="3" fill="#FFF7C2" />
      <path
        d="M47 11v2.5M47 20.5V23M41 17h2.5M50.5 17H53"
        stroke="#FFF7C2"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </Tile>
  );
}

export function TerminalIcon(props: IconProps) {
  return (
    <Tile colors={["#2A3140", "#0A0D13"]} {...props}>
      <rect x="9" y="12" width="46" height="40" rx="6" fill="#0F141C" stroke="#2C3646" />
      <circle cx="15" cy="18" r="1.6" fill="#3A4659" />
      <circle cx="20" cy="18" r="1.6" fill="#3A4659" />
      <path
        d="M17 29l7 5-7 5"
        fill="none"
        stroke="#5EF0B0"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M28 41h12" stroke="#5EF0B0" strokeWidth="3" strokeLinecap="round" />
    </Tile>
  );
}

export function DetectorIcon(props: IconProps) {
  const id = useId();
  return (
    <Tile colors={["#4B2BB5", "#120A3A"]} {...props}>
      <defs>
        <radialGradient id={`${id}glow`}>
          <stop offset="0" stopColor="#B9F6FF" />
          <stop offset="1" stopColor="#5BD8FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="18" rx="16" ry="5.5" fill="none" stroke="#B7C3FF" strokeWidth="2" />
      <path d="M16 18v26M48 18v26" stroke="#B7C3FF" strokeWidth="2" />
      <path d="M16 44a16 5.5 0 0 0 32 0" fill="none" stroke="#B7C3FF" strokeWidth="2" />
      <path
        d="M16 44a16 5.5 0 0 1 32 0"
        fill="none"
        stroke="#B7C3FF"
        strokeWidth="1.2"
        strokeDasharray="2 3"
        opacity="0.6"
      />
      <circle cx="35" cy="31" r="8" fill={`url(#${id}glow)`} />
      <circle cx="35" cy="31" r="2.4" fill="#ECFDFF" />
      <path
        d="M35 31L22 21M35 31l11 13M35 31l-9 15"
        stroke="#7FE3FF"
        strokeWidth="1"
        opacity="0.7"
      />
    </Tile>
  );
}

export function ActivityIcon(props: IconProps) {
  const id = useId();
  return (
    <Tile colors={["#1E2638", "#0A0F1A"]} {...props}>
      <defs>
        <linearGradient id={`${id}line`} x1="0" x2="1">
          <stop offset="0" stopColor="#FF9F5A" />
          <stop offset="1" stopColor="#FF5FA8" />
        </linearGradient>
      </defs>
      <path d="M12 22h40M12 32h40M12 42h40" stroke="#26324A" strokeWidth="1.4" />
      <path
        d="M12 38l7-2 5 4 6-16 6 20 5-10 4 3 7-9"
        fill="none"
        stroke={`url(#${id}line)`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="52" cy="28" r="2.6" fill="#FF5FA8" />
    </Tile>
  );
}

export function MusicIcon(props: IconProps) {
  return (
    <Tile colors={["#FF8A3D", "#C21E6B"]} {...props}>
      <circle cx="30" cy="34" r="18" fill="#1B1020" />
      <circle cx="30" cy="34" r="14" fill="none" stroke="#3A2440" strokeWidth="1" />
      <circle cx="30" cy="34" r="10.5" fill="none" stroke="#3A2440" strokeWidth="1" />
      <circle cx="30" cy="34" r="6" fill="#FFC94D" />
      <circle cx="30" cy="34" r="1.6" fill="#1B1020" />
      <path d="M46 12v17" stroke="#FFF3E6" strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M46 12c3 1 6 3 6 7"
        fill="none"
        stroke="#FFF3E6"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </Tile>
  );
}

export const APP_ICONS: Record<AppId, (props: IconProps) => React.JSX.Element> = {
  notes: NotesIcon,
  finder: FinderIcon,
  terminal: TerminalIcon,
  detector: DetectorIcon,
  activity: ActivityIcon,
  music: MusicIcon,
};

export function AppIcon({ app, ...props }: IconProps & { app: AppId }) {
  const Icon = APP_ICONS[app];
  return <Icon {...props} />;
}
