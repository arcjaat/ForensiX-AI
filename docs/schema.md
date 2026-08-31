# Database Schema (Supabase / PostgreSQL)

## Tables & Relationships

### 1. `users`
* `id` (UUID, Primary Key)
* `username` (Varchar 50, Unique)
* `role` (Varchar 20, Default 'officer')
* `created_at` (Timestamp)

### 2. `screening_logs`
* `id` (UUID, Primary Key)
* `officer_id` (Foreign Key -> users.id)
* `document_type` (Varchar 30)
* `verdict` (Varchar 20 - 'Genuine', 'Suspicious', 'Fake')
* `trust_score` (Integer, 0-100)
* `ocr_confidence` (Float)
* `ela_tamper_score` (Float)
* `compression_warning` (Boolean)
* `face_match_score` (Float)
* `raw_image_hash` (Varchar 64)

### 3. `extracted_metadata`
* `id` (Serial, Primary Key)
* `screening_id` (Foreign Key -> screening_logs.id)
* `field_name` (Varchar 50)
* `field_value_redacted` (Varchar 255) - strictly masked (e.g., '[Aadhaar Redacted]')
* `confidence` (Float)

### 4. `forensic_regions`
* `id` (Serial, Primary Key)
* `screening_id` (Foreign Key -> screening_logs.id)
* `x_min`, `y_min`, `x_max`, `y_max` (Integers)
* `anomaly_score` (Float)