import csv
from datetime import datetime
import uuid
from fpdf import FPDF

# =========================
# 1️⃣ Dati di esempio
# =========================
valutazioni = [
    {
        "Fase": "Avvio worker",
        "Obiettivo": "Processo in ascolto senza errori",
        "Esito atteso": "✅ Worker attivo",
        "Esito reale": "✅ Worker attivo correttamente",
        "Note/Anomalie": ""
    },
    {
        "Fase": "Test singolo controllo",
        "Obiettivo": "OCR + estrazione punti completati",
        "Esito atteso": "✅ Stato 'done' + punti in review",
        "Esito reale": "⚠️ Stato 'done' ma note minori",
        "Note/Anomalie": "Piccola discrepanza OCR"
    }
]

# =========================
# 2️⃣ Funzione export CSV
# =========================
def export_csv(dati, filename):
    with open(filename, mode="w", encoding="utf-8", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["Fase","Obiettivo","Esito atteso","Esito reale","Note/Anomalie","Timestamp","ID_sessione"])
        for riga in dati:
            writer.writerow([
                riga["Fase"],
                riga["Obiettivo"],
                riga["Esito atteso"],
                riga["Esito reale"],
                riga["Note/Anomalie"],
                datetime.now().strftime("%Y-%m-%d %H:%M"),
                "TEST-" + uuid.uuid4().hex[:8].upper()
            ])

# =========================
# 3️⃣ Funzione export PDF
# =========================
class PDF(FPDF):
    def header(self):
        self.set_font("Helvetica", 'B', 14)
        self.cell(0, 10, "Report Collaudo Finale", border=False, ln=True, align="C")
        self.ln(5)

    def chapter_table(self, dati):
        self.set_font("Helvetica", '', 10)
        col_widths = [35, 55, 35, 35, 50]
        headers = ["Fase", "Obiettivo", "Esito atteso", "Esito reale", "Note/Anomalie"]
        # Intestazioni
        for i, head in enumerate(headers):
            self.cell(col_widths[i], 8, head, border=1, align="C")
        self.ln()
        # Righe dati
        for riga in dati:
            self.cell(col_widths[0], 8, riga["Fase"], border=1)
            self.cell(col_widths[1], 8, riga["Obiettivo"], border=1)
            self.cell(col_widths[2], 8, riga["Esito atteso"], border=1, align="C")
            self.cell(col_widths[3], 8, riga["Esito reale"], border=1, align="C")
            self.cell(col_widths[4], 8, riga["Note/Anomalie"], border=1)
            self.ln()


def export_pdf(dati, filename):
    pdf = PDF()
    pdf.add_page()
    pdf.chapter_table(dati)
    pdf.output(filename)

# =========================
# 4️⃣ Esecuzione
# =========================
csv_file = "collaudo_finale.csv"
pdf_file = "collaudo_finale.pdf"

export_csv(valutazioni, csv_file)
export_pdf(valutazioni, pdf_file)

print(f"✅ File CSV creato: {csv_file}")
print(f"✅ File PDF creato: {pdf_file}")
