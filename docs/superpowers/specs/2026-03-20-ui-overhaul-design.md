# NeuroVault UI/UX Overhaul — Design Spec

**Date:** 2026-03-20
**Goal:** Transform NeuroVault from a generic AI-generated dark-mode web3 app into a polished, professional neuroscience data platform.
**Design Direction:** "Clinical Precision meets Quiet Tech" — Stripe meets a neuroscience journal.
**Tailwind Version:** v3 (^3.4.16). All config and plugins assume Tailwind v3.

---

## 1. Design System

### 1.1 Color Palette

Replace scattered cyan/violet/emerald with a cohesive, restrained palette.

**Important:** shadcn/ui expects HSL-based CSS variables. All colors below are defined in HSL format for compatibility. The hex values are provided for reference only.

**Backgrounds (blue-tinted dark, not pure slate):**
- `--bg-deep: 220 40% 3%` (#06090f) — page background, aliased as `--background` for shadcn
- `--bg-surface: 220 30% 8%` (#0c1220) — card/panel surfaces, aliased as `--card` for shadcn
- `--bg-elevated: 220 26% 11%` (#111827) — elevated elements (modals, dropdowns), aliased as `--popover`
- `--bg-hover: 215 22% 15%` (#1a2332) — hover states on surfaces

**Borders & Dividers:**
- `--border-subtle: 217 19% 17%` (#1e293b) — default borders, aliased as `--border` for shadcn
- `--border-muted: 218 28% 14%` (#162032) — very subtle separators

**Text:**
- `--text-primary: 210 40% 96%` (#f1f5f9) — headings, primary content, aliased as `--foreground`
- `--text-secondary: 215 16% 62%` (#94a3b8) — body text, descriptions, aliased as `--muted-foreground`
- `--text-tertiary: 215 14% 46%` (#64748b) — labels, metadata, timestamps

**Primary (indigo-blue — evokes neural imaging):**
- `--primary: 239 84% 67%` (#6366f1) — buttons, links, active states
- `--primary-foreground: 0 0% 100%` — text on primary buttons
- `--primary-hover: 239 84% 74%` (#818cf8) — hover
- `--primary-muted: 239 84% 67% / 0.12` — backgrounds, badges

**Accent (warm amber — premium CTAs, earnings):**
- `--accent: 38 92% 50%` (#f59e0b) — earnings, highlights, important CTAs
- `--accent-foreground: 0 0% 100%` — text on accent buttons
- `--accent-muted: 38 92% 50% / 0.12` — badges

**Semantic:**
- `--success: 160 84% 39%` (#10b981) — success, active, verified
- `--success-muted: 160 84% 39% / 0.12`
- `--error: 347 77% 60%` (#f43f5e) — errors, destructive actions. Aliased as `--destructive`.
- `--error-muted: 347 77% 60% / 0.12`
- `--warning: 32 95% 44%` (#d97706) — warnings, expiring licenses. Distinct from accent — darker/more orange to differentiate from the brighter amber used for earnings/CTAs.
- `--info: 239 84% 67%` — info states. Intentionally same as primary; context + iconography distinguishes.

### 1.2 Typography

Keep Space Grotesk (headings) + Inter (body). Tighten the hierarchy.

| Role | Font | Size | Weight | Tracking |
|------|------|------|--------|----------|
| Page title | Space Grotesk | 2rem (32px) | 600 | -0.025em |
| Section heading | Space Grotesk | 1.5rem (24px) | 600 | -0.02em |
| Card heading | Space Grotesk | 1.125rem (18px) | 500 | -0.015em |
| Body | Inter | 0.875rem (14px) | 400 | 0 |
| Small/Label | Inter | 0.75rem (12px) | 500 | 0.02em |
| Caption | Inter | 0.6875rem (11px) | 400 | 0.025em |

### 1.3 Spacing

Use a 4px base grid. Key spacing tokens:
- `xs: 4px`, `sm: 8px`, `md: 12px`, `lg: 16px`, `xl: 24px`, `2xl: 32px`, `3xl: 48px`, `4xl: 64px`

Page-level padding: `xl (24px)` mobile, `3xl (48px)` desktop.
Card padding: `lg (16px)` mobile, `xl (24px)` desktop.
Max content width: `1200px` — defined as `max-w-screen-content` in Tailwind config (custom value, not `max-w-7xl` which is 1280px).

### 1.4 Component Primitives

Install **shadcn/ui** for base components, then custom-theme them. shadcn init will scaffold its own CSS variables in `globals.css` — we override those with the palette defined in 1.1.

**Components to install:**
- `button` — primary, secondary, ghost, destructive variants
- `card` — surface containers
- `badge` — status indicators, tags
- `input` — search, form fields
- `dialog` — modals (dataset detail, purchase flow)
- `tabs` — profile tabs, filter tabs
- `tooltip` — info hints
- `separator` — dividers
- `skeleton` — loading states (replace custom skeletons)
- `dropdown-menu` — navbar user menu
- `sheet` — slide-over panel for dataset detail on explore page

**Custom theme overrides:**
- Cards: `bg-card` with `border border-border`, no heavy shadows
- Buttons primary: `bg-primary text-primary-foreground` with subtle hover brightness, not gradient
- Inputs: `bg-background` with `border-border`, focus ring in primary
- Badges: pill shape, muted background + colored text (not solid fill)

### 1.5 Iconography

Replace all inline SVGs with **lucide-react** (tree-shakeable, consistent 24px grid).

Install: `pnpm add lucide-react --filter @neurovault/web`

Use consistently: 16px for inline/badges, 20px for buttons, 24px for standalone.

### 1.6 Motion

Restrained, purposeful motion only:
- Page transitions: fade + 4px translateY, 200ms ease-out
- Card hover: subtle border-color shift, 150ms
- Button hover: background lightens, 100ms
- Skeleton: keep existing shimmer (it's good)
- Remove: glow-pulse, aggressive scale animations, canvas waveform in hero

### 1.7 Chart Theme

Recharts (v3.7.0, already installed) colors must migrate from current cyan to new palette:
- Area/line fill: `hsl(var(--primary-muted))` with `hsl(var(--primary))` stroke
- Bar fill: `hsl(var(--primary))` with hover to `hsl(var(--primary-hover))`
- Grid lines: `hsl(var(--border-muted))`
- Axis text: `hsl(var(--text-tertiary))`
- Tooltip: `bg-elevated` background with `border-subtle`

### 1.8 Toast Theme

Update Sonner toast overrides to use new design tokens:
- Background: `hsl(var(--bg-elevated))`
- Border: `1px solid hsl(var(--border-subtle))`
- Text: `hsl(var(--text-primary))`

---

## 2. Page Designs

### 2.1 Landing Page (`/`)

**Current problems:** Generic 4-step "How It Works", emoji-heavy stats, typical AI hero template.

**New structure:**

```
┌─────────────────────────────────────────────────────────────┐
│ Navbar                                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Hero (left-aligned, not centered)                          │
│  ┌──────────────────────┐  ┌─────────────────────────┐      │
│  │ "The Neural Data     │  │  [EEG Visualization     │      │
│  │  Commons"            │  │   — CSS/SVG waveform,   │      │
│  │                      │  │   not canvas animation]  │      │
│  │ Subtitle text...     │  │                         │      │
│  │                      │  │                         │      │
│  │ [Get Started]  [Docs]│  └─────────────────────────┘      │
│  └──────────────────────┘                                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Stats bar (inline, minimal — not big cards)                │
│  47 Datasets  ·  23 Contributors  ·  2.4 GB Encrypted      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  "Built for Researchers" section                            │
│  3 feature cards — grid-cols-[1fr_1.5fr_1fr] (asymmetric)  │
│  ┌──────────┐ ┌──────────────────┐ ┌──────────┐            │
│  │ Privacy  │ │ Decentralized    │ │ Fair     │            │
│  │ First    │ │ Storage          │ │ Earnings │            │
│  └──────────┘ └──────────────────┘ └──────────┘            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  "How It Works" — horizontal timeline (not numbered cards)  │
│  Upload ──→ Encrypt ──→ Store ──→ Earn                      │
│  (brief one-liner under each)                               │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tech Stack — small logo strip, no big cards                │
│  [Filecoin] [Lit] [Flow] [NEAR] [Storacha] [WorldID]       │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  CTA section                                                 │
│  "Start contributing neural data today"                      │
│  [Launch App]                                                │
├─────────────────────────────────────────────────────────────┤
│  Footer (minimal — links + hackathon badge)                 │
└─────────────────────────────────────────────────────────────┘
```

**Key changes:**
- Hero: left-aligned text + right-side visual (not centered everything)
- Hero visual: CSS/SVG-based EEG waveform visualization (lightweight, styled with design tokens — NOT a canvas animation). Generated from mock data using SVG `<path>` elements with subtle CSS animation (stroke-dashoffset for a drawing effect).
- Stats: inline horizontal bar, not big emoji cards
- Features: asymmetric card widths — `grid-cols-[1fr_1.5fr_1fr]` so the center card is larger, creating visual interest
- How It Works: horizontal timeline connector, not numbered cards
- Tech stack: logo strip at bottom, not large showcase section
- Kill: animated canvas hero, glow effects, counter animations

### 2.2 Navbar

**Current problems:** Bulky, web3-heavy with wallet/WorldID taking too much space.

**New design:**
```
┌──────────────────────────────────────────────────────────────┐
│  ◆ NeuroVault    Dashboard  Explore  Upload    [Connect ▾]  │
└──────────────────────────────────────────────────────────────┘
```

- Logo mark + wordmark (small, not oversized)
- Nav links: text-only, active state = primary color underline
- Right side: single "Connect" button using shadcn DropdownMenu
- **Connect flow:**
  1. Disconnected: "Connect" button → dropdown with "Connect Wallet" (calls `useFlow().connect()`)
  2. After wallet connected: button shows truncated address (e.g., `0x1a2b…3c4d`)
  3. Click connected address → dropdown with: "Verify with World ID" (if not verified), "Profile", "Disconnect"
  4. WorldIDButton component is absorbed into this dropdown as a menu item — it no longer renders standalone
- **Demo mode indicator:** When no wallet connected, show a small muted badge in the navbar: `Demo` next to the Connect button
- Mobile: hamburger menu, slide-down panel
- Sticky with subtle backdrop-blur on scroll

### 2.3 Dashboard (`/dashboard`)

**Current problems:** Generic stat cards with emojis, activity feed feels like a placeholder.

**New structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ Navbar                                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Welcome back, 0x1a2b...          [Upload New] [Explore]    │
│                                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│  │ 12     │ │ 3.2    │ │ 8      │ │ 94     │               │
│  │Datasets│ │FLOW    │ │Licenses│ │Impact  │               │
│  └────────┘ └────────┘ └────────┘ └────────┘               │
│                                                              │
│  ┌─────────────────────────┐ ┌──────────────────┐           │
│  │ Earnings (Area Chart)   │ │ Recent Activity  │           │
│  │                         │ │                  │           │
│  │ [chart with proper      │ │ • Uploaded xyz   │           │
│  │  axis labels, grid]     │ │ • Access granted │           │
│  │                         │ │ • Payment recv'd │           │
│  └─────────────────────────┘ └──────────────────┘           │
│                                                              │
│  My Datasets                                                 │
│  ┌─────────────────────────────────────────────┐            │
│  │ Table with proper column headers, sorting   │            │
│  │ indicators, status badges                   │            │
│  └─────────────────────────────────────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key changes:**
- Stat cards: numbers-first, no emojis, subtle lucide icon in corner, use semantic colors
- Earnings chart: proper axes, grid lines, tooltip on hover, area fill with primary-muted (see Section 1.7)
- Activity feed: clean list with small dot indicators (not emoji), relative timestamps
- Datasets table: proper table with column headers, badges for status, hover rows
- Quick actions: collapsed into 2 small ghost buttons in page header ("Upload New", "Explore") instead of the large sidebar cards — preserves navigation affordance without clutter
- Demo mode: handled by navbar badge (Section 2.2), no page-level banner

### 2.4 Explore (`/explore`)

**Current problems:** Visually dense, smart search panel is noisy, dataset cards have too much inline data.

**New structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ Navbar                                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Explore Datasets                                            │
│                                                              │
│  ┌─────────────────────────────────────────────────┐        │
│  │ 🔍 Search datasets...   [AI] [Filters ▾]       │        │
│  └─────────────────────────────────────────────────┘        │
│                                                              │
│  Filter chips: [All] [Motor] [Cognitive] [Sleep] [P300]     │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ Dataset  │ │ Dataset  │ │ Dataset  │                    │
│  │ card     │ │ card     │ │ card     │                    │
│  │          │ │          │ │          │                    │
│  │ name     │ │ name     │ │ name     │                    │
│  │ channels │ │ channels │ │ channels │                    │
│  │ price    │ │ price    │ │ price    │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key changes:**
- Search: single input with integrated filter dropdown, not separate smart search panel
- Smart Search (NEAR AI): accessible via an "AI" toggle button within the search bar — when active, transforms the input into natural language mode and shows structured filter chips below
- Dataset cards: cleaner layout — name, task badge, key metrics (channels, duration), price. No CID shown by default.
- **Dataset detail: click card → opens a shadcn Sheet (slide-over panel from right)** with full details, EEG viewer, purchase flow. Sheet chosen over modal because datasets have long content (waveforms, metadata) that benefits from a tall scrollable panel.
- Purchase flow: clean multi-step dialog within the sheet
- Filter chips: horizontal scrollable pills for task types
- Remove: match score badges (unless AI search active), demo mode banner

### 2.5 Profile (`/profile`)

**Current problems:** Generic profile page, earnings breakdown is basic.

**Key changes:**
- Cleaner header: avatar + address + World ID badge inline
- Stats as a horizontal strip below header (same style as dashboard)
- Tabs using shadcn Tabs component (cleaner than custom)
- Datasets list: consistent card style with explore page
- Earnings: proper bar chart with labels (using recharts with new theme, Section 1.7)
- Licenses table: clean table with expiry badges — `success` = active, `warning` (#d97706) = expiring soon, `error` = expired

---

## 3. Shared Patterns

### 3.1 Empty States
- Centered illustration area (simple lucide icon, 48px, tertiary color)
- Clear heading + one-line description
- CTA button if applicable
- No cartoon/emoji illustrations

### 3.2 Loading States
- Use shadcn Skeleton component (replaces custom `Skeleton.tsx`)
- Match exact layout of loaded content
- Subtle shimmer (port existing animation to shadcn skeleton)

### 3.3 Error States
- Inline error messages with `error` color
- Toast for transient errors (keep sonner, restyle per Section 1.8)
- ErrorBoundary.tsx: keep as-is functionally, restyle the fallback UI to use new design tokens
- Full-page error for critical failures with retry CTA

### 3.4 Demo Mode
- Navbar-level muted badge: "Demo" next to Connect button (Section 2.2)
- No page-level banners. The badge is always visible since the navbar is sticky, maintaining awareness without visual noise.

### 3.5 Responsive Behavior
- Mobile: single-column, cards stack, table becomes card list
- Tablet: 2-column grid
- Desktop: full layout (`max-w-screen-content` / 1200px centered)
- Navbar: hamburger on mobile, full nav on desktop

---

## 4. Dependencies to Add

```bash
# In the monorepo root:
pnpm add lucide-react tailwindcss-animate class-variance-authority clsx tailwind-merge --filter @neurovault/web

# In apps/web/:
cd apps/web
npx shadcn@latest init
npx shadcn@latest add button card badge input dialog tabs tooltip separator skeleton dropdown-menu sheet
```

shadcn init will:
- Create `components/ui/` directory
- Create `lib/utils.ts` with `cn()` helper
- Update `globals.css` with CSS variable structure
- Update `tailwind.config.ts` with shadcn plugin

After init, override the generated CSS variables with our palette (Section 1.1).

### 4.1 Tailwind Config Updates

Extend tailwind.config.ts with:
- shadcn's color mappings pointing to CSS variables
- `tailwindcss-animate` plugin
- Custom screen `content: '1200px'` for `max-w-screen-content`
- Custom `fontFamily` entries for heading (Space Grotesk) and body (Inter)

### 4.2 Existing Dependencies (no changes)

- `recharts` v3.7.0 — keep, retheme colors (Section 1.7)
- `sonner` v2.0.7 — keep, restyle (Section 1.8)
- `@worldcoin/idkit` — keep, WorldIDButton absorbed into Navbar dropdown
- All blockchain hooks (`useFlow`, `useLitProtocol`, `useNEAR`, `useStoracha`, `useWorldID`) — untouched, call sites in pages may change but hook internals do not

---

## 5. Files Changed

| File | Action | Description |
|------|--------|-------------|
| `styles/globals.css` | Rewrite | CSS custom properties (HSL format) for design tokens, shadcn base styles, updated Sonner overrides |
| `tailwind.config.ts` | Rewrite | Color tokens from CSS vars, font config, plugins, custom max-width |
| `lib/utils.ts` | Create | `cn()` utility for shadcn (auto-created by shadcn init) |
| `components/ui/*` | Create | shadcn components (auto-generated by shadcn add) |
| `app/layout.tsx` | Edit | Update body classes for new bg color, update Sonner theme |
| `app/page.tsx` | Rewrite | New landing page layout with SVG hero, asymmetric features, timeline |
| `app/dashboard/page.tsx` | Rewrite | New dashboard with proper charts, clean stat cards, table |
| `app/explore/page.tsx` | Rewrite | Cleaner search + card grid + sheet-based detail view |
| `app/profile/page.tsx` | Rewrite | Cleaner profile with shadcn tabs and recharts bar chart |
| `components/layout/Navbar.tsx` | Rewrite | Sleeker navigation with Connect dropdown absorbing WorldIDButton |
| `components/layout/Skeleton.tsx` | Delete | Replaced by shadcn skeleton |
| `components/layout/EmptyState.tsx` | Rewrite | Cleaner empty states with lucide icons |
| `components/layout/ErrorBoundary.tsx` | Edit | Restyle fallback UI to use new design tokens (keep logic) |
| `components/WorldIDButton.tsx` | Edit | Adapt for use inside dropdown menu (remove standalone container styling) |
| `components/eeg/*.tsx` | Edit | Update container styling (borders, backgrounds, text colors) to use new design tokens. Internal visualization logic and colors stay as-is. |
| `components/explore/MLClassifier.tsx` | Edit | Update container styling to new tokens |
| `components/upload/EncryptionStatus.tsx` | No change | Out of scope (upload flow) |
| `components/upload/StorageStatus.tsx` | No change | Out of scope (upload flow) |
| `components/upload/AccessConditionBuilder.tsx` | No change | Out of scope (upload flow) |

---

## 6. Out of Scope

- Upload flow pages and components (keep as-is for now)
- API routes (no changes)
- Blockchain hook internals (`hooks/*`) — call sites may change, but hooks themselves are untouched
- EEG visualization internal rendering logic (only containers restyled)
- Test page (ignore)
- `@neurovault/eeg-utils` workspace package (do not touch)
- `contracts/` directory (do not touch)

---

## 7. Success Criteria

1. No page uses more than 2 accent colors simultaneously
2. All interactive elements use shadcn primitives (consistent hover/focus/active states)
3. All icons come from lucide-react (no inline SVGs except tech stack logos)
4. Typography follows the defined hierarchy exactly
5. A designer looking at the app cannot immediately tell it was AI-generated
6. Landing page loads without any canvas/heavy animations
7. All pages are responsive (mobile, tablet, desktop)
8. Chart colors use the new palette (no leftover cyan)
9. Toast notifications styled with new tokens
10. Demo mode is indicated via navbar badge, not page-level banners
