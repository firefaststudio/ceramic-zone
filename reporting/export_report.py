#!/usr/bin/env python3
timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
session_id = "ABC123"  # In produzione: generare dinamicamente
import argparse
import csv
import datetime
import hashlib
import json
import uuid
from pathlib import Path
from fpdf import FPDF
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def sha256_file(p: Path):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def load_sample_records():
    return [
        {"id": 1, "titolo": "Bug login", "risolto": False},
        {"id": 2, "titolo": "Aggiornare policy", "risolto": True},
        {"id": 3, "titolo": "Errore pagamento", "risolto": False}
    ]


def render_report(records, out_dir: Path, session_id: str):
    out_dir.mkdir(parents=True, exist_ok=True)
    totale = len(records)
    risolti = sum(1 for r in records if r["risolto"])
    non_risolti = totale - risolti

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename_base = f"report_{timestamp}_{session_id}"

    # CSV
    csv_path = out_dir / f"{filename_base}.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["ID", "Titolo", "Risolto"])
        for r in sorted(records, key=lambda x: x["risolto"]):
            writer.writerow([r["id"], r["titolo"], "Risolto" if r["risolto"] else "Non risolto"])

    # Grafico (pie)
    plt.figure(figsize=(4, 4))
    colors = ["#4CAF50", "#F44336"]
    plt.pie([risolti, non_risolti], labels=["Risolti", "Non risolti"], autopct="%1.1f%%", colors=colors)
    plt.title("Stato segnalazioni")
    chart_path = out_dir / f"{filename_base}_chart.png"
    plt.savefig(chart_path, bbox_inches='tight')
    plt.close()

    # PDF
    class PDF(FPDF):
        def header(self):
            self.set_font("Arial", "B", 14)
            self.cell(0, 10, "Report KPI Segnalazioni", 0, 1, "C")

        def footer(self):
            self.set_y(-15)
            self.set_font("Arial", "I", 8)
            self.cell(0, 10, f"Pagina {self.page_no()}", 0, 0, "C")

    pdf = PDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # KPI in PDF
    pdf.set_font("Arial", "", 12)
    pdf.cell(0, 10, f"Totale segnalazioni: {totale}", ln=True)
    pdf.cell(0, 10, f"Risolti: {risolti}", ln=True)
    pdf.cell(0, 10, f"Non risolti: {non_risolti}", ln=True)
    pdf.ln(5)

    # Grafico nel PDF
    try:
        pdf.image(str(chart_path), x=60, w=80)
    except Exception as e:
        print('Warning: unable to add chart to PDF:', e)
    pdf.ln(10)

    # Tabella segnalazioni
    pdf.set_font("Arial", "B", 12)
    pdf.cell(20, 10, "ID", 1)
    pdf.cell(100, 10, "Titolo", 1)
    pdf.cell(40, 10, "Stato", 1)
    pdf.ln()

    pdf.set_font("Arial", "", 12)
    for r in sorted(records, key=lambda x: x["risolto"]):
        stato = "Risolto" if r["risolto"] else "Non risolto"
        pdf.cell(20, 10, str(r["id"]), 1)
        pdf.cell(100, 10, r["titolo"], 1)
        if r["risolto"]:
            pdf.set_text_color(0, 128, 0)
        else:
            pdf.set_text_color(200, 0, 0)
        pdf.cell(40, 10, stato, 1)
        pdf.set_text_color(0, 0, 0)
        pdf.ln()

    # Salvataggio PDF
    pdf_path = out_dir / f"{filename_base}.pdf"
    pdf.output(str(pdf_path))

    # meta
    meta = {
        "run_id": session_id,
        "generated_at": datetime.datetime.now().isoformat(),
        "csv": str(csv_path.name),
        "pdf": str(pdf_path.name),
    }
    try:
        meta["csv_sha256"] = sha256_file(csv_path)
        meta["pdf_sha256"] = sha256_file(pdf_path)
    except Exception as e:
        meta["hash_error"] = str(e)

    meta_path = out_dir / f"{filename_base}.meta.json"
    with open(meta_path, 'w', encoding='utf-8') as mf:
        json.dump(meta, mf, indent=2, ensure_ascii=False)

    return {"csv": csv_path, "pdf": pdf_path, "meta": meta_path}


def main():
    parser = argparse.ArgumentParser(description='Export report CSV+PDF with KPI and chart')
    parser.add_argument('--out-dir', '-o', default=str(Path(__file__).resolve().parent / 'output'))
    parser.add_argument('--session-id', '-s', default=None)
    parser.add_argument('--data-file', '-i', default=None, help='optional JSON file with records')
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    session_id = args.session_id or uuid.uuid4().hex[:8]

    # load data
    if args.data_file:
        import json
        with open(args.data_file, 'r', encoding='utf-8') as df:
            records = json.load(df)
    else:
        records = load_sample_records()

    artifacts = render_report(records, out_dir, session_id)
    print(f"Report CSV salvato in: {artifacts['csv']}")
    print(f"Report PDF salvato in: {artifacts['pdf']}")
    print(f"Meta salvato in: {artifacts['meta']}")


if __name__ == '__main__':
    main()
