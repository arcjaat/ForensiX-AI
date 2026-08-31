# UI/UX Design System Specification
**Inspiration:** Stitch AI / Developer-First Data Platforms
**Vibe:** Technical, clean, dark-mode optimized, professional forensic tool.

## 1. Typography
* **Primary UI:** `Inter` or `Geist` (Headers, buttons).
* **Data/Monospace:** `JetBrains Mono` or `Fira Code` (JSON payloads, metadata values, scan IDs).

## 2. Color Palette (Tailwind)
* **Backgrounds:** `zinc-950` (#09090b), Panels: `zinc-900`.
* **Borders:** Crisp 1px outlines (`zinc-700`).
* **Text:** Primary: `zinc-50`, Muted: `zinc-400`.
* **Status Accents:**
  * **Genuine:** `emerald-500` (High contrast, neon green)
  * **Suspicious:** `amber-500` (Warning alerts)
  * **Fake:** `rose-500` (Critical failure)
  * **Brand Primary:** `indigo-500` (Active states, loading)

## 3. Layout Attributes
* Flat design, sharp or slightly rounded corners (`rounded-md`), no heavy drop shadows.
* ELA heatmap uses `JET` colormap to contrast against the dark UI.
* Target brackets use SVG paths in `rose-500`.