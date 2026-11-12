# DESIGN.md - LabTrack (Laboratory Inventory & Borrowing Management System)

## Design Read
Reading this as: laboratory inventory and borrowing operations web app for computer lab admins and operational staff, in an operational light-first precision style with functional light/dark toggle, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Three Dials
- **ENERGY 2 (Balanced)**: Confident typographic hierarchy, crisp 1px structural borders, high-contrast operational labels, and restrained focal color without marketing clutter.
- **RHYTHM 2 (Consistent with deliberate breaks)**: Unified operational navigation shell across pages, with each route structured around its primary user task (operational overview and quick dispatch on `/`, dense searchable ledger on `/inventaris`, split entry-form plus active queue on `/peminjaman`, return checklist and scoped history on `/pengembalian`, and account access ledger on `/pengguna`).
- **MOTION 1 (Hover and focus feedback only)**: Crisp color/border state transitions and zero looping animations, wrapped in `prefers-reduced-motion` support.

## Palette (R-29, R-25)
- **Light Mode (Default)**:
  - Canvas background: `#F6F5F1` (warm technical ledger paper, avoids sterile flat white default)
  - Elevated surface: `#FFFFFF`
  - Structural divider: `#D6D3CB` (control borders `#78746B` for >= 3:1 non-text contrast)
  - Primary ink: `#161B22` (15.86:1 on `#F6F5F1`)
  - Secondary ink: `#4A525D` (7.25:1 on `#F6F5F1`)
  - Brand Core (Deep Lab Teal): `#0F4C5C` (9.51:1 white text contrast)
  - Deliberate Accent (Burnt Terracotta): `#B83B0B` (5.72:1 white text contrast, reserved for the primary action per screen and active borrowing highlights)
- **Dark Mode (Functional Toggle - R-21, R-34)**:
  - Canvas background: `#101418`
  - Elevated surface: `#171D24`
  - Structural divider: `#28323D` (control borders `#6A7685`, 3.67:1 UI contrast)
  - Primary ink: `#F1F3F5` (15.25:1 on `#171D24`)
  - Secondary ink: `#A8B2BE` (7.90:1 on `#171D24`)
  - Brand Core (Teal Accent): `#56B9D0` (7.47:1 on `#171D24`)
  - Deliberate Accent: `#B83B0B` on solid primary CTAs with `#FFFFFF` text (5.72:1), `#FB923C` for inline accent text (7.50:1 on `#171D24`)
- **Semantic Status Tokens (paired with text labels and geometric status markers, never color alone)**:
  - Tersedia / Selesai: `#14532D` on `#DCFCE7` (light) / `#86EFAC` on `#132A1C` (dark)
  - Dipinjam / Menipis: `#7C2D12` on `#FFEDD5` (light) / `#FDBA74` on `#2E1A11` (dark)
  - Habis / Nonaktif / Error: `#7F1D1D` on `#FEE2E2` (light) / `#FCA5A5` on `#321619` (dark)

## Typography (R-06)
- **Primary UI & Headings**: `Plus Jakarta Sans` (clear Indonesian/Latin legibility, neutral technical warmth suited for campus computer lab staff).
- **Codes & Tabular Stock Figures**: `IBM Plex Mono` restricted to item codes (`BR001`), transaction IDs (`PJM-0001`), and numeric stock columns (`tabular-nums`).

## Identity Motif & Radii (R-11)
- Physical lab logbook modernized: crisp 1px borders, monospace code tags (`BR001`) left-aligned on every hardware row, and a dual-tone availability ratio bar (`Tersedia / Total`) instead of decorative cards.
- Border radii intentionally stepped: `4px` on code tags and status badges, `6px` on buttons and form fields, `8px` on main ledger containers.

## Decision Log (R-31)
- **Color**: Warm ivory ledger surface paired with deep teal and burnt terracotta separates operational focus from generic white/blue SaaS defaults while passing WCAG AA in both light and dark modes.
- **Layout**: Horizontal top navigation with a clean role tag replaces the generic 4-card + donut chart sidebar shell so tables and forms retain full width across desktop and tablet screens, collapsing into a labelled mobile menu and quick bar on narrow viewports.
- **Typography**: `Plus Jakarta Sans` handles prose and Indonesian labels cleanly while `IBM Plex Mono` distinguishes hardware SKUs and stock counts without turning headings into decorative terminal text.
- **Icons**: Custom crisp 1.75px square-cap geometric SVGs match technical lab equipment and avoid generic AI sparkles or uniform rounded icon libraries.
- **Shadow & Glass**: Surfaces rely on 1px structural borders and tonal step elevation; subtle shadow is reserved strictly for open modal dialogs so the page stays grounded.

