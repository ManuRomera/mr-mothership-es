#!/usr/bin/env python3
"""Extrae del sistema upstream todo lo traducible a work/src/*.json"""
import json, re, pathlib, html
R = pathlib.Path(__file__).resolve().parent.parent
U = R/'work/upstream'; S = R/'work/src'; S.mkdir(parents=True, exist_ok=True)

def flat(o, p=''):
    for k, v in o.items():
        if isinstance(v, dict): yield from flat(v, f'{p}{k}.')
        else: yield p+k, v
en = json.load(open(U/'lang/en.json'))
lang = dict(flat(en['Mosh'], 'Mosh.'))
json.dump(lang, open(S/'lang.json', 'w'), ensure_ascii=False, indent=1)

# literales fijos en plantillas y JS (nodos de texto y atributos visibles)
lits = set(); pats = set()
node = re.compile(r'>([^<>]+)<')
attr = re.compile(r'\b(?:placeholder|title|data-tooltip|aria-label|label|value)="([^"{}$<>]*[A-Za-z]{3,}[^"{}$<>]*)"')
files = list((U/'templates').rglob('*.html')) + list((U/'module').rglob('*.js')) + list((U/'_macros').rglob('*.js'))
for f in files:
    t = f.read_text()
    for m in node.finditer(t):
        s = re.sub(r'\s+', ' ', html.unescape(m.group(1))).strip()
        if len(re.findall('[A-Za-z]', s)) < 3 or s.startswith('{{') or s.startswith(('//', '*')) or re.search(r'[;=]\s|=>|function|\bvar\b|\bconst\b|\blet\b', s): continue
        (pats if re.search(r'\{\{|\$\{', s) else lits).add(s)
    if f.suffix == '.html':
        for m in attr.finditer(t): lits.add(m.group(1).strip())
# cadenas JS con texto de interfaz
js = re.compile(r'(?:notifications\.(?:warn|info|error)\(|title:\s*|label:\s*|flavor:\s*)([`"\'])((?:(?!\1).)+)\1')
for f in list((U/'module').rglob('*.js')) + list((U/'_macros').rglob('*.js')):
    for m in js.finditer(f.read_text()):
        s = m.group(2).strip()
        if re.search('[A-Za-z]{3,}', s) and 'localize' not in s and not s.startswith(('game.', 'systems/')):
            (pats if re.search(r'\$\{|\{\{', s) else lits).add(s)
lits = {x for x in lits if (re.match(r'^[A-Z@+\[.,;:)]', x) or (len(x) > 25 and ' ' in x)) and 'localize' not in x and not x.startswith('@UUID') and not re.search(r'RADIO_|\$\{|\+ |\)\+|\{\{|world\.Item', x)}
json.dump(sorted(lits), open(S/'literals.json', 'w'), ensure_ascii=False, indent=1)
json.dump(sorted(pats), open(S/'patterns.json', 'w'), ensure_ascii=False, indent=1)

# compendios
for p in sorted((U/'packs').glob('*.db')):
    rows = [json.loads(l) for l in p.read_text().splitlines() if l.strip()]
    out = {}
    for r in rows:
        e = {'name': r['name']}
        d = (r.get('system') or {}).get('description')
        if d: e['description'] = d
        if r.get('description'): e['description'] = r['description']
        if r.get('results'): e['results'] = {x['_id']: x['text'] for x in r['results'] if x.get('text')}
        out[r['_id']] = e
    json.dump(out, open(S/f'pack.{p.stem}.json', 'w'), ensure_ascii=False, indent=1)
print({f.name: len(json.load(open(f))) for f in S.glob('*.json')})

# párrafos completos dentro de los macros (se sustituyen enteros en el command al montar)
import hashlib
lit_re = re.compile(r'`((?:(?!`).)*)`|"((?:(?!").)*)"|\'((?:(?!\').)*)\'', re.S)
bloque = re.compile(r'</?(?:div|p|br|ul|ol|li|h\d|section|img|table|tr|td|button)\b[^>]*>', re.I)
unidades = {}
for p in sorted((U/'packs').glob('macros_*.db')):
    for l in p.read_text().splitlines():
        if not l.strip(): continue
        cmd = json.loads(l)['command']
        for m in lit_re.finditer(cmd):
            s = next(g for g in m.groups() if g is not None)
            if '<' not in s: continue
            for pieza in bloque.split(s):
                pieza = pieza.strip()
                plano = re.sub(r'<[^>]+>', '', pieza)
                if '${' in pieza or len(re.findall(r'[A-Za-z]{2,}', plano)) < 4 or re.search(r'[;{}=]|game\.|await |^fas ', plano): continue
                unidades[hashlib.sha1(pieza.encode()).hexdigest()[:10]] = pieza
json.dump(unidades, open(S/'macrotext.json', 'w'), ensure_ascii=False, indent=1)
print('unidades de macro:', len(unidades))
