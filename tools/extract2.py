#!/usr/bin/env python3
"""Segunda pasada: cualquier cadena del JS del sistema que parezca texto para humanos y etiquetas de template.json.
Escribe work/src/literals2.json (las que no están ya en literals.json). Ejecutar después de extract.py."""
import json, re, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
U = R/'work/upstream'; S = R/'work/src'

LIT = re.compile(r'"((?:[^"\\\n]|\\.)*)"|\'((?:[^\'\\\n]|\\.)*)\'|`((?:[^`\\]|\\.)*)`')
CLAVE = re.compile(r'\b(name|hint|label|title|text|description|placeholder|tooltip|message|content|flavor|header)\s*:\s*$', re.I)
BLOQUE = re.compile(r'</?(?:div|p|br|ul|ol|li|h\d|section|img|table|tr|td|button)\b[^>]*>', re.I)
CODIGO = re.compile(r'[{};=]|=>|\.(js|png|html|webp|svg)\b|^[.#]|^fa[sr]? |^action_|^Mosh\.|\w\.\w+\(|[a-z]_[a-z]|^[a-z]+(-[a-z]+)+$|^[a-z]+(\.[a-zA-Z]+)+$|^[a-z]+[A-Z]\w*$|^[A-Za-z0-9]{16}$|^table\d|^prototypeToken|^grid|^border|^text-|^part-|^re going|^[\w-]+: ?[\w-]+')

def candidata(s, pre):
    s = s.strip()
    if not s or '${' in s or CODIGO.search(s): return False
    pal = re.findall(r"[A-Za-z']{2,}", re.sub(r'<[^>]+>', '', s))
    if len(pal) >= 2 and re.search(r'[a-z]{3}', s): return True
    return bool(CLAVE.search(pre.rstrip())) and len(pal) >= 1 and s[0].isupper()

nuevas = set()
for f in (U/'module').rglob('*.js'):
    for line in f.read_text().splitlines():
        if re.match(r'\s*(//|\*|/\*)', line) or 'console.' in line: continue
        for m in LIT.finditer(line):
            s = next(g for g in m.groups() if g is not None)
            for pieza in (BLOQUE.split(s) if '<' in s else [s]):
                pieza = re.sub(r'^(</?(?:strong|b|i|em|span)[^>]*>)+|(<(?:strong|b|i|em|span)[^>]*>)+$', '', pieza.strip()).strip()
                if candidata(pieza, line[:m.start()]): nuevas.add(re.sub(r'\s+', ' ', pieza).strip())

def etiquetas(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == 'label' and isinstance(v, str): yield v
            else: yield from etiquetas(v)
    elif isinstance(o, list):
        for v in o: yield from etiquetas(v)
nuevas |= set(etiquetas(json.load(open(U/'template.json'))))

ya = set(json.load(open(S/'literals.json')))
nuevas = sorted(x for x in nuevas if x not in ya and not x.startswith('@UUID'))
json.dump(nuevas, open(S/'literals2.json', 'w'), ensure_ascii=False, indent=1)
print('literales2:', len(nuevas))
