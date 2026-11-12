import { BadgeTone } from "@/lib/types";
import { IconAlert, IconCheck, IconClock } from "./icons";

export type { BadgeTone };

interface StatusBadgeProps {
  tone: BadgeTone;
  label: string;
  withIcon?: boolean;
}

const TONE_STYLES: Record<BadgeTone, { bg: string; fg: string }> = {
  ok: { bg: "var(--status-ok-bg)", fg: "var(--status-ok-fg)" },
  warn: { bg: "var(--status-warn-bg)", fg: "var(--status-warn-fg)" },
  err: { bg: "var(--status-err-bg)", fg: "var(--status-err-fg)" },
  neutral: { bg: "var(--status-neutral-bg)", fg: "var(--status-neutral-fg)" },
};

export function StatusBadge({ tone, label, withIcon = true }: StatusBadgeProps) {
  const palette = TONE_STYLES[tone];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-xs font-semibold leading-none whitespace-nowrap"
      style={{
        backgroundColor: palette.bg,
        color: palette.fg,
      }}
    >
      {withIcon && tone === "ok" && <IconCheck />}
      {withIcon && tone === "warn" && <IconClock />}
      {withIcon && tone === "err" && <IconAlert />}
      <span>{label}</span>
    </span>
  );
}
