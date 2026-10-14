// ds-icons.jsx - petit set d'icônes line, 24px, stroke 2
// Style: rond, friendly, lisible

const Icon = ({ name, size = 24, color = "currentColor", strokeWidth = 2 }) => {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: { display: "block", flexShrink: 0 },
  };
  switch (name) {
    case "home":
      return (
        <svg {...props}>
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "compass":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M15.5 8.5L13 13l-4.5 2.5L11 11z" />
        </svg>
      );
    case "heart":
      return (
        <svg {...props}>
          <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...props}>
          <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
          <path d="M5 6H3v2a3 3 0 0 0 3 3M19 6h2v2a3 3 0 0 1-3 3" />
          <path d="M9 17h6M10 13v4M14 13v4M8 21h8" />
        </svg>
      );
    case "user":
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
      );
    case "bell":
      return (
        <svg {...props}>
          <path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2H4.5L6 17z" />
          <path d="M10 21h4" />
        </svg>
      );
    case "play":
      return (
        <svg {...props}>
          <path d="M7 5l12 7-12 7V5z" />
        </svg>
      );
    case "lock":
      return (
        <svg {...props}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path d="M5 12l5 5 9-11" />
        </svg>
      );
    case "x":
      return (
        <svg {...props}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...props}>
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg {...props}>
          <path d="M19 12H5M11 5l-7 7 7 7" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...props}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...props}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      );
    case "star":
      return (
        <svg {...props}>
          <path d="M12 3l2.7 5.5 6 .9-4.3 4.3 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9z" />
        </svg>
      );
    case "eye":
      return (
        <svg {...props}>
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "eye-off":
      return (
        <svg {...props}>
          <path d="M3 3l18 18" />
          <path d="M10 5.2A10 10 0 0 1 22 12s-1.4 2.5-3.7 4.4M6.3 7.3C3.7 9 2 12 2 12s4 7 10 7c1.6 0 3.1-.5 4.4-1.2" />
          <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
        </svg>
      );
    case "mail":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      );
    case "phone":
      return (
        <svg {...props}>
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
        </svg>
      );
    case "gear":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      );
    case "plus":
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "cart":
      return (
        <svg {...props}>
          <path d="M3 4h2l2.5 12h11l2-9H6" />
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
        </svg>
      );
    case "book":
      return (
        <svg {...props}>
          <path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2V5z" />
          <path d="M9 3v18" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...props}>
          <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
          <path d="M19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
        </svg>
      );
    case "flame":
      return (
        <svg {...props}>
          <path d="M12 3s4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 1-3s-1 5 3 5 3-4 3-4-1-3-3-6z" />
        </svg>
      );
    case "rocket":
      return (
        <svg {...props}>
          <path d="M14 4c5 0 6 6 6 6s-3 1-6 4-4 6-4 6-6-1-6-6c0-3 3-3 5-5s3-5 5-5z" />
          <circle cx="15" cy="9" r="1.5" />
        </svg>
      );
    case "gift":
      return (
        <svg {...props}>
          <rect x="3" y="9" width="18" height="11" rx="1" />
          <path d="M3 13h18M12 9v11M8 9a3 3 0 0 1 0-6c2 0 4 6 4 6s2-6 4-6a3 3 0 0 1 0 6" />
        </svg>
      );
    case "logout":
      return (
        <svg {...props}>
          <path d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    case "video":
      return (
        <svg {...props}>
          <rect x="2" y="6" width="18" height="12" rx="2" />
          <path d="M10 10v4l4-2z" fill={color} stroke="none" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
};

window.Icon = Icon;
