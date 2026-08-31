# Pre-Flight Checklist

Run this after `docker compose up --build` and before any live demo or
rehearsal. Two ways to work through it: run `scripts/smoke_test.sh` for the
backend checks automatically, or walk the manual steps below (useful if
`jq`/`curl` aren't available, or you want to see raw responses).

## 0. Start the stack

```bash
cp .env.example .env        # first time only; defaults work as-is
python scripts/seed_demo_samples.py   # generates /samples if not already present
docker compose up --build
```

Expect three containers: `sih26188_db`, `sih26188_backend`,
`sih26188_frontend`. First build will be slow (PyTorch/EasyOCR/OpenCV
layers) — subsequent starts are fast.

## 1. Automated smoke test (recommended)

```bash
./scripts/smoke_test.sh
```

This hits `/health`, `/preprocess`, and `/screen` (against all three demo
samples) and checks the response shape — verdict, trust score, flagged
region count, and the compression-warning flag — against what each sample
is supposed to produce. Exits non-zero on any failure, so you know
immediately if something regressed since the last rehearsal.

If `jq` isn't installed, the script tells you how to get it rather than
failing silently — install it or fall back to the manual checks below.

## 2. Manual checklist (if you want to see it with your own eyes)

- [ ] **`docker compose ps`** — all three services show `Up` / `healthy`.
- [ ] **`curl http://localhost:8000/api/v1/health`** → `{"status":"ok"}`.
- [ ] **`curl -F "file=@samples/sample_clean.jpg" http://localhost:8000/api/v1/preprocess`**
      → HTTP 200, `crop_method` is `"perspective_warp"` or `"bounding_box"`
      (not `"none"` — if it's `"none"` on the clean sample, the preprocessing
      pipeline isn't finding the card boundary and needs attention before
      the demo).
- [ ] **`curl -F "id_document=@samples/sample_clean.jpg" http://localhost:8000/api/v1/screen`**
      → HTTP 200, `result.verdict` is `"Genuine"` (or at least not
      `"Fake"`), `ela.suspicious_regions` is empty, `ela.compression_warning`
      is `false`.
- [ ] Same against **`sample_tampered_dob.jpg`** → `ela.suspicious_regions`
      has at least one entry, trust score visibly lower than the clean run.
- [ ] Same against **`sample_whatsapp_forward.jpg`** → `ela.compression_warning`
      is `true` and `ela.forensic_notes` is non-empty.
- [ ] **Open `http://localhost:5173`** — header's connection indicator shows
      "Backend Online" within a few seconds (confirms the frontend can
      actually reach the backend through the Vite proxy, not just that both
      containers are individually up).
- [ ] **Upload `sample_clean.jpg` through the UI** — preview pane shows both
      original and deskewed versions; Trust Score gauge animates in;
      verdict badge is green.
- [ ] **Upload `sample_tampered_dob.jpg` through the UI** — toggle the ELA
      heatmap and confirm the DOB field visibly lights up with a
      targeting-bracket overlay; verdict badge is amber/red.
- [ ] **Upload `sample_whatsapp_forward.jpg` through the UI** — amber
      compression-warning banner appears on the Verdict card.
- [ ] **Download the PDF report** on any result — file opens and shows the
      verdict, extracted fields, and ELA/face-match numbers.

## 3. Known gaps to narrate around (not bugs — just not built yet)

Be upfront about these if asked, rather than caught off guard:

- **Face match is still a stub.** `face_match.similarity_score` is always
  `0.0` and `face_detected_on_*` are always `false` — Feature #4 (Siamese
  network) hasn't been built yet. The UI's "Verify Face Match" flow and the
  Signal Breakdown panel are wired and ready for it, but the backend result
  is a placeholder.
- **OCR quality depends on real EasyOCR, not yet smoke-tested end-to-end.**
  The field-parsing logic (`extract_fields`, redaction, line-grouping) was
  validated against `pytesseract` output as a stand-in, since `easyocr`/
  `torch` can't be installed in an offline environment. The actual EasyOCR
  detection quality on the demo samples should be checked once during the
  `docker compose up --build` above — cheap to verify, worth doing before
  going live rather than assuming it matches the pytesseract results.
- **ELA thresholds are tuned against synthetic cards, not a large real
  sample set.** They're now env-configurable (see `.env.example`) precisely
  so they can be re-tuned quickly if a real document behaves differently
  than expected during rehearsal.
- **The `/static` mount is dev-only,** serving uploaded ID photos and
  heatmaps unauthenticated. Fine for a local demo; flagged in `main.py` as
  something to fix before any real deployment.

## 4. If something fails

- **Backend healthcheck never goes green** → `docker compose logs backend`;
  usually a missed system dependency (libgl1 etc.) or a bad `DATABASE_URL`.
- **Frontend shows "Backend Offline"** → check `PROXY_TARGET` is set to
  `http://backend:8000` in the frontend service's environment (docker
  network hostname, not `localhost` — see the comment in
  `docker-compose.yml` for why this matters).
- **`/preprocess` returns `crop_method: "none"` on a sample that should
  detect a card** → the Canny/contour thresholds in
  `backend/app/services/preprocessor.py` may need retuning for that image's
  lighting/contrast; not expected on the provided samples, but worth
  knowing where to look if a real ID photo doesn't crop cleanly during the
  demo.
