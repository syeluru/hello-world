import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 22, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export const IHome = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
  </svg>
);
export const IDumbbell = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 12h12M4 8v8M20 8v8M7 6v12M17 6v12M2 10v4M22 10v4" />
  </svg>
);
export const IUser = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
export const IBack = (p: P) => (
  <svg {...base(p)}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);
export const IChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);
export const IChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const IClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IMinus = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);
export const ICheck = (p: P) => (
  <svg {...base({ strokeWidth: 3, ...p })}>
    <path d="m5 12 5 5 9-10" />
  </svg>
);
export const IMore = (p: P) => (
  <svg {...base(p)}>
    <circle cx="5" cy="12" r="1.6" fill="currentColor" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    <circle cx="19" cy="12" r="1.6" fill="currentColor" />
  </svg>
);
export const ITimer = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2M9 2h6" />
  </svg>
);
export const ISearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const ISettings = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
export const ITrophy = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M17 6h3a2 2 0 0 1-2 4h-1M7 6H4a2 2 0 0 0 2 4h1" />
  </svg>
);
export const IClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IWeight = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 12h12M4 8v8M20 8v8M8 6v12M16 6v12" />
  </svg>
);
export const ICalendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
export const IChart = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);
export const IRuler = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8h18v8H3zM7 8v3M11 8v3M15 8v3M19 8v3" />
  </svg>
);
export const IList = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);
export const IEdit = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);
export const ITrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
  </svg>
);
export const ICopy = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);
export const IFolder = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);
export const INote = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 3h9l5 5v13H6zM14 3v6h6M9 13h6M9 17h6" />
  </svg>
);
export const ISwap = (p: P) => (
  <svg {...base(p)}>
    <path d="M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12" />
  </svg>
);
export const ILink = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);
export const IArrows = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" />
  </svg>
);
export const IChevronUp = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 15 6-6 6 6" />
  </svg>
);
export const IPlay = (p: P) => (
  <svg {...base({ fill: "currentColor", ...p })}>
    <path d="M7 5v14l11-7z" />
  </svg>
);
export const IShare = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v12M8 7l4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);
export const IInfo = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
export const IFlame = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s1 2 2 2c0-3 2-5 2-8z" />
  </svg>
);
export const ICloud = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4 4 0 0 1 0 9z" />
  </svg>
);
