from flask import Flask, request, jsonify
import camelot
import tempfile
import os

app = Flask(__name__)

@app.route('/extract-tables', methods=['POST'])
def extract_tables():
    # Accept file upload (multipart/form-data) or JSON body with 'url'
    if 'file' in request.files:
        f = request.files['file']
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        f.save(tmp.name)
        filepath = tmp.name
    else:
        data = request.get_json()
        url = data.get('url')
        if not url:
            return jsonify({'error':'no file or url provided'}), 400
        # download file
        import requests
        r = requests.get(url)
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        with open(tmp.name, 'wb') as fh:
            fh.write(r.content)
        filepath = tmp.name

    try:
        # Camelot can use flavor='lattice' or 'stream'
        tables_lattice = camelot.read_pdf(filepath, flavor='lattice', pages='all')
        tables_stream = camelot.read_pdf(filepath, flavor='stream', pages='all')
        out = []
        for i, t in enumerate(tables_lattice):
            out.append({'table_id': f'lattice_{i}', 'data': t.df.values.tolist()})
        for i, t in enumerate(tables_stream):
            out.append({'table_id': f'stream_{i}', 'data': t.df.values.tolist()})
        return jsonify(out)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        try:
            os.unlink(filepath)
        except Exception:
            pass
