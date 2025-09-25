#!/usr/bin/env python3
import csv
import json
import sys
from datetime import datetime
import uuid
from pathlib import Path

"""
Export collaudo CSV.
Usage:
  python scripts/export_collaudo.py [input.json] [out.csv]
If input.json is omitted, uses reports/template.json if present, otherwise example data.
"""

DEFAULT_JSON = Path('reports/template.json')

example = [
    {
        "Fase": "Avvio worker",
        "Obiettivo": "Processo in ascolto senza errori",
        "Esito atteso": "✅ Worker attivo",
        "Esito reale": "✅ Worker attivo correttamente",
        "Note/Anomalie": "",
    },
]


def load_input(path: Path):
    if not path.exists():
        return example
    try:
        with path.open('r', encoding='utf-8') as f:
            doc = json.load(f)
            if isinstance(doc, dict) and 'report' in doc:
                return doc['report']
            if isinstance(doc, list):
                return doc
    except Exception as e:
        print('Warning: failed to read', path, e)
    return example


def make_session_id():
    now = datetime.utcnow()
    return f"TEST-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def export_collaudo(rows, out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open('w', encoding='utf-8', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Fase","Obiettivo","Esito atteso","Esito reale","Note/Anomalie","Timestamp","ID_sessione"])
        session = make_session_id()
        for r in rows:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            writer.writerow([
                r.get('Fase',''),
                r.get('Obiettivo',''),
                r.get('Esito atteso',''),
                r.get('Esito reale',''),
                r.get('Note/Anomalie',''),
                timestamp,
                session
            ])
    print(f"Saved CSV: {out_path}")


if __name__ == '__main__':
    in_arg = Path(sys.argv[1]) if len(sys.argv) >= 2 else DEFAULT_JSON
    out_arg = Path(sys.argv[2]) if len(sys.argv) >= 3 else Path('reports/collaudo_finale-')
    if out_arg.is_dir() or str(out_arg).endswith('-'):
        ts = datetime.utcnow().strftime('%Y%m%dT%H%M%S')
        out_arg = Path(f"reports/collaudo_finale-{ts}.csv")

    rows = load_input(in_arg)
    export_collaudo(rows, out_arg)
