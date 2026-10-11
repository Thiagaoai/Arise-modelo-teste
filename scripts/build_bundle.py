"""Gera worker/src/data.json: prompt do tutor, fatos do livro e contextos curados (opcionais) por capítulo.
O texto dos 22 capítulos vem do D1 (tabelas bible, almeida, greek); aqui só entra o que é curado à mão."""
import json, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ctxdir = f'{ROOT}/data/context'
chapters = {}
for fn in sorted(os.listdir(ctxdir)):
    if fn.startswith('apocalipse-') and fn.endswith('.json'):
        c = json.load(open(f'{ctxdir}/{fn}', encoding='utf8'))
        chapters[str(c['capitulo'])] = {'context': c}
out = {'prompt': open(f'{ROOT}/prompts/tutor.md', encoding='utf8').read(),
       'livro': json.load(open(f'{ctxdir}/livro-apocalipse.json', encoding='utf8')),
       'chapters': chapters}
json.dump(out, open(f'{ROOT}/worker/src/data.json', 'w', encoding='utf8'), ensure_ascii=False)
print('capitulos curados:', list(chapters), '| tamanho:', os.path.getsize(f'{ROOT}/worker/src/data.json') // 1024, 'KB')
