import json, sqlite3, unicodedata, os
R = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'apocalipse.db')
n = lambda s: unicodedata.normalize('NFC', s)
if os.path.exists(OUT): os.remove(OUT)
db = sqlite3.connect(OUT)
db.executescript("""
CREATE TABLE verses(version TEXT, ch INT, v INT, text TEXT, PRIMARY KEY(version,ch,v));
CREATE TABLE words(ch INT, v INT, pos INT, tag TEXT, parse TEXT, form TEXT, lemma TEXT,
                   strong TEXT, strong_ambiguous INT, gloss_kjv TEXT, def_strong TEXT, derivation TEXT);
""")
for ver in ['livre', 'almeida', 'tischendorf']:
    for c in range(1, 23):
        for v in json.load(open(f'{R}/{ver}/{c}.json', encoding='utf8'))['verses']:
            db.execute('INSERT INTO verses VALUES(?,?,?,?)', (ver, v['chapter'], v['verse'], v['text'].strip()))
raw = open(f'{R}/strongs-greek.js', encoding='utf8').read()
d = json.loads(raw[raw.index('{', raw.index('strongsGreekDictionary')):raw.rindex('}') + 1])
lem = {}
for k, v in d.items(): lem.setdefault(n(v['lemma']), []).append(k)
posn = {}
for l in open(f'{R}/morphgnt-re.txt', encoding='utf8'):
    f = l.split(); ref = f[0]; ch, vs = int(ref[2:4]), int(ref[4:6])
    posn[(ch, vs)] = posn.get((ch, vs), 0) + 1
    ks = lem.get(n(f[6]), []); e = d[ks[0]] if ks else {}
    db.execute('INSERT INTO words VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
        (ch, vs, posn[(ch, vs)], f[1], f[2], f[3], f[6], ks[0] if ks else None, int(len(ks) > 1),
         e.get('kjv_def'), (e.get('strongs_def') or '').strip(), e.get('derivation')))
db.commit()
for t in ['verses', 'words']: print(t, db.execute(f'select count(*) from {t}').fetchone()[0])
print('palavras sem Strong:', db.execute('select count(*) from words where strong is null').fetchone()[0])
print('lemas ambiguos:', db.execute('select count(distinct lemma) from words where strong_ambiguous=1').fetchone()[0])
