# Developer & AI Agent Directives

## 1. Absolute Privacy & Redaction Rule (NON-NEGOTIABLE)
* **Never output, process, or mock real Aadhaar, PAN, or Passport numbers.** 
* In all dummy data, JSON payloads, logs, and SQL database seeds, you MUST replace specific ID numeric sequences with `[Aadhaar Redacted]` or `XXXX-XXXX-XXXX`.

## 2. Code Quality & Standards
* **Backend:** Strictly use Python `async/await` for I/O and SQL database operations in FastAPI. Use `pydantic` v2 for schema validation.
* **Frontend:** Strict TypeScript. Use Tailwind CSS utility classes. 
* **Error Handling:** APIs must never crash on bad inputs. Return HTTP 422 if OpenCV cannot find a document contour.

## 3. UI Aesthetic
* Adhere strictly to the Stitch AI dark mode palette (`zinc-950` backgrounds, 1px `zinc-700` borders, monospace technical fonts for data).