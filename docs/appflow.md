# Application Flow & UX Architecture

## 1. High-Level User Journey
[Officer Log In] ──► [Dashboard Upload ScanSelfie]
                           │
                           ▼
                 [Async Processing]
                 • OpenCV Preprocessing
                 • Python OCR + ELA + Face Match
                           │
                           ▼
                 [Interactive Results Screen]
                 • Trust Score Dial (0–100) & Verdict Banner
                 • Dual-Canvas ELA Heatmap Viewer
                 • Redacted Metadata Table
                 • Export PDF Report Button

## 2. UX Step Definitions
 Upload Side-by-side thumbnail comparison of raw upload vs. deskewed crop.
 Result Review 
   `GENUINE` (Green), `SUSPICIOUS` (Amber), `FAKE` (Red).
   Compression Warning Amber banner alerts if WhatsApp-style pre-compression is detected.
 Forensic Viewer Slider (0–100%) blends the JET-colormap ELA heatmap over the document. SVG brackets highlight tampered pixels.