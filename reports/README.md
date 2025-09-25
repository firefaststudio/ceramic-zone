Report generator

This repo contains small helpers to generate the final test report in CSV and PDF formats.

Files:
- `reports/generate_pdf_from_csv.mjs` - Node script that reads a CSV and produces a styled PDF. Supports `--logo` and `--attach` (images).
- `reports/generate_report_both.mjs` - wrapper that copies/converts a CSV/JSON into `reports/output/` and generates the PDF with a UUID'd filename.
- `scripts/export_collaudo_example.py` - small Python example that writes a CSV and a simple PDF using `fpdf`.

Quick run (PowerShell):

```powershell
# Node version - wrapper
node reports\generate_report_both.mjs reports\sample_run.csv --logo path\to\logo.png

# Python example (requires Python + pip install fpdf)
python scripts\export_collaudo_example.py
```

If Python is not present, use the Node scripts instead (`npm run report:both`).
