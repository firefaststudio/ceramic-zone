Python table extractor microservice

Usage:
- Build: docker build -t table-extractor:latest .
- Run: docker run -p 5000:5000 table-extractor:latest

API:
POST /extract-tables
- multipart/form-data with field `file` containing PDF
- or JSON body { "url": "https://.../file.pdf" }

Response: JSON array of tables: [{ table_id, data: [[...], ...] }, ...]

Notes:
- Camelot requires ghostscript/poppler; Dockerfile installs them.
- This is a lightweight skeleton; production needs auth, rate-limiting, and file size limits.
