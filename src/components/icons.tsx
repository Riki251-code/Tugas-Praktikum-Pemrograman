import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function baseProps(props: IconProps): IconProps {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "square",
    strokeLinejoin: "miter",
    "aria-hidden": true,
    ...props,
  };
}

export function IconOverview(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="3" y="3" width="8" height="8" />
      <rect x="13" y="3" width="8" height="5" />
      <rect x="13" y="10" width="8" height="11" />
      <rect x="3" y="13" width="8" height="8" />
    </svg>
  );
}

export function IconBox(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 7.5L12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M4 7.5L12 12l8-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

export function IconBorrowOut(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M9 4H5v16h4" />
      <path d="M10 12h10" />
      <path d="M16 8l4 4-4 4" />
    </svg>
  );
}

export function IconReturnIn(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M15 4h4v16h-4" />
      <path d="M14 12H4" />
      <path d="M8 8l-4 4 4 4" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 19.5c0-3 2.5-5 6-5s6 2 6 5" />
      <circle cx="17.5" cy="9" r="2.5" />
      <path d="M17.5 14c2.2 0 3.8 1.4 3.8 3.8" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L20.5 20.5" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconEdit(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
      <path d="M12.5 7.5l4 4" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M7 7l1 13h8l1-13" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" />
    </svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M10 4H5v16h5" />
      <path d="M15 8l4 4-4 4" />
      <path d="M9 12h10" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...baseProps({ width: 14, height: 14, ...props })}>
      <path d="M4.5 12.5l5 5 10-10" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...baseProps({ width: 14, height: 14, ...props })}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...baseProps({ width: 14, height: 14, ...props })}>
      <path d="M12 3L2 20h20L12 3z" />
      <path d="M12 9.5v4.5" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3 3l18 18" />
      <path d="M9.9 5.3A10.7 10.7 0 0 1 12 5.5c6.2 0 10 6.5 10 6.5a18 18 0 0 1-4.1 4.8" />
      <path d="M6.4 6.7C3.8 8.6 2 12 2 12s3.8 6.5 10 6.5c1.7 0 3.3-.4 4.6-1" />
    </svg>
  );
}

