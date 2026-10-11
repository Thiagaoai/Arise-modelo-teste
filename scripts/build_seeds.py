"""Gera os SQL que povoam o D1: Bíblia Livre completa, grego, palavras com Strong e referências cruzadas.
Rode depois de fetch_data.sh e build_db.py. Saída: worker/seed/*.sql (não vai para o git)."""
import json, os, re, sqlite3
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = f'{ROOT}/worker/seed'; os.makedirs(OUT, exist_ok=True)
q = lambda s: "'" + str(s).replace("'", "''") + "'"
OSIS = "Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev".split()
BK = {o: i + 1 for i, o in enumerate(OSIS)}

stm = ["CREATE TABLE IF NOT EXISTS bible (book INTEGER NOT NULL, ch INTEGER NOT NULL, v INTEGER NOT NULL, text TEXT NOT NULL, PRIMARY KEY (book, ch, v));",
       "CREATE TABLE IF NOT EXISTS greek (ch INTEGER, v INTEGER, text TEXT NOT NULL, PRIMARY KEY (ch,v));",
       "CREATE TABLE IF NOT EXISTS almeida (ch INTEGER, v INTEGER, text TEXT NOT NULL, PRIMARY KEY (ch,v));",
       "CREATE TABLE IF NOT EXISTS words (ch INTEGER, v INTEGER, pos INTEGER, tag TEXT, form TEXT, lemma TEXT, strong TEXT, gloss TEXT, def TEXT, PRIMARY KEY (ch,v,pos));",
       "CREATE TABLE IF NOT EXISTS xrefs (ch INTEGER, v INTEGER, to_book INTEGER, to_ch INTEGER, to_v1 INTEGER, to_v2 INTEGER, votes INTEGER);",
       "CREATE INDEX IF NOT EXISTS idx_xrefs ON xrefs (ch, v, votes);",
       "DELETE FROM bible;", "DELETE FROM greek;", "DELETE FROM almeida;", "DELETE FROM words;", "DELETE FROM xrefs;"]
def ins(table, rows, step):
    for i in range(0, len(rows), step):
        stm.append(f"INSERT INTO {table} VALUES " + ",".join("(" + ",".join('NULL' if x is None else (str(x) if isinstance(x, int) else q(x)) for x in r) + ")" for r in rows[i:i + step]) + ";")

full = json.load(open(f'{ROOT}/data/raw/livre-full.json', encoding='utf8'))
ins('bible', [(b['nr'], c['chapter'], v['verse'], v['text'].strip()) for b in full['books'] for c in b['chapters'] for v in c['verses']], 30)
ins('greek', [(v['chapter'], v['verse'], v['text'].strip()) for c in range(1, 23) for v in json.load(open(f'{ROOT}/data/raw/tischendorf/{c}.json', encoding='utf8'))['verses']], 40)
ins('almeida', [(v['chapter'], v['verse'], v['text'].strip()) for c in range(1, 23) for v in json.load(open(f'{ROOT}/data/raw/almeida/{c}.json', encoding='utf8'))['verses']], 40)
db = sqlite3.connect(f'{ROOT}/data/apocalipse.db')
ins('words', db.execute("select ch,v,pos,tag,form,lemma,strong,gloss_kjv,def_strong from words").fetchall(), 40)
pat = re.compile(r'^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)(?:-([1-3]?[A-Za-z]+)\.(\d+)\.(\d+))?$')
xs = []
for l in open(f'{ROOT}/data/raw/cross_references.txt', encoding='utf8').read().splitlines()[1:]:
    p = l.split('\t')
    if len(p) < 3 or not p[0].startswith('Rev.'): continue
    a, b = pat.match(p[0]), pat.match(p[1])
    if not a or not b or b.group(1) not in BK: continue
    v2 = int(b.group(6)) if b.group(4) and b.group(4) == b.group(1) and b.group(5) == b.group(2) else int(b.group(3))
    xs.append((int(a.group(2)), int(a.group(3)), BK[b.group(1)], int(b.group(2)), int(b.group(3)), max(v2, int(b.group(3))), int(p[2])))
ins('xrefs', xs, 80)

for f in os.listdir(OUT):
    if f.endswith('.sql'): os.remove(f'{OUT}/{f}')
n = 0; buf = []; size = 0
for s in stm:
    buf.append(s); size += len(s.encode())
    if size > 600_000:
        open(f'{OUT}/data_{n:02d}.sql', 'w', encoding='utf8').write("\n".join(buf)); n += 1; buf = []; size = 0
if buf: open(f'{OUT}/data_{n:02d}.sql', 'w', encoding='utf8').write("\n".join(buf)); n += 1
print(n, 'arquivos em worker/seed/ -> wrangler d1 execute arise-bot --remote --file=worker/seed/data_NN.sql (em ordem)')
