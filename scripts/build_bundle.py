"""Gera worker/src/data.json: prompt do tutor + versículos e contexto dos capítulos que já têm contexto."""
import json, os, sqlite3
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
db = sqlite3.connect(f'{ROOT}/data/apocalipse.db')
chapters = {}
for fn in sorted(os.listdir(f'{ROOT}/data/context')):
    if not fn.startswith('apocalipse-') or not fn.endswith('.json'): continue
    ctx = json.load(open(f'{ROOT}/data/context/{fn}', encoding='utf8'))
    ch = ctx['capitulo']
    get = lambda ver: dict(db.execute("select v,text from verses where version=? and ch=? order by v", (ver, ch)))
    livre, alm, grc = get('livre'), get('almeida'), get('tischendorf')
    chapters[str(ch)] = {
        'verses': [{'v': v, 'livre': livre.get(v, ''), 'almeida': alm.get(v, ''), 'grego': grc.get(v, '')}
                   for v in sorted(set(livre) | set(alm) | set(grc))],
        'context': ctx}
out = {'prompt': open(f'{ROOT}/prompts/tutor.md', encoding='utf8').read(), 'chapters': chapters}
json.dump(out, open(f'{ROOT}/worker/src/data.json', 'w', encoding='utf8'), ensure_ascii=False)
print('capitulos no bundle:', list(chapters), '| tamanho:', os.path.getsize(f'{ROOT}/worker/src/data.json') // 1024, 'KB')
