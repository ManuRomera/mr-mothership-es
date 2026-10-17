#!/usr/bin/env python3
"""Une work/out/*.json en lang/es.json, lang/literales.json y compendium/mosh.<pack>.json"""
import json, re, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
OUT = R/'work/out'; SRC = R/'work/src'

def juntar(nombre):
    d = {}
    for f in sorted(OUT.glob(f'{nombre}.[0-9][0-9].json')): d.update(json.load(open(f)))
    return d

# lang/es.json (anidado como en.json)
plano = juntar('lang')
orig = json.load(open(SRC/'lang.json'))
faltan = [k for k in orig if k not in plano]
anid = {}
for k, v in plano.items():
    p = k.split('.')[1:]; c = anid
    for x in p[:-1]: c = c.setdefault(x, {})
    c[p[-1]] = v
json.dump({'Mosh': anid}, open(R/'lang/es.json', 'w'), ensure_ascii=False, indent=2)

# literales: textos fijos de plantillas/JS + patrones con datos interpolados
lit = {k: v for k, v in juntar('literals').items() if v and v != k}
lit['Bleeding'] = 'Sangrado'
lit.update({'SUCCESS!': '¡ÉXITO!', 'FAILURE!': '¡FALLO!', 'CRITICAL SUCCESS!': '¡ÉXITO CRÍTICO!', 'CRITICAL FAILURE!': '¡FALLO CRÍTICO!',
            'to': 'a', 'Reduce the most relevant Stat or Save by': 'Reduce la Característica o Salvación más relevante en'})
lit['+1 Stress'] = '+1 Estrés'
lit['-1d10 Calm'] = '-1d10 Calma'
patrones = [
    {'en': r'^Your controlled Actor does not have an item named (.+)$', 'es': 'Tu actor controlado no tiene ningún objeto llamado $1'},
    {'en': r'^Extra wounds: (.+)$', 'es': 'Heridas extra: $1'},
    {'en': r'^Reduce the most relevant Stat or Save by (.+)$', 'es': 'Reduce en $1 la Característica o Salvación más relevante'},
    {'en': r'^Credits: (.+)$', 'es': 'Créditos: $1'},
    {'en': r'^Health: (.+)$', 'es': 'Salud: $1'},
    {'en': r'^(.+) from$', 'es': '$1 de'},
    {'en': r'^Rolling for (.+)$', 'es': 'Tirando por $1'},
]
json.dump({'literales': lit, 'patrones': patrones}, open(R/'lang/literales.json', 'w'), ensure_ascii=False, indent=1)

# párrafos de macros: se sustituyen enteros dentro del command
mt = juntar('macrotext'); MT = json.load(open(SRC/'macrotext.json'))
# compendios para Babele
ETIQ = {'conditions': 'Condiciones', 'items_maintenance': 'Averías de mantenimiento', 'macros_hotbar': 'Macros de la barra',
        'macros_triggered': 'Macros de activación', 'rolltables': 'Tablas'}
for f in sorted(SRC.glob('pack.*.json')):
    pack = f.stem[5:]; orig = json.load(open(f)); tr = juntar(f.stem)
    ent = {}
    for i, o in orig.items():
        t = tr.get(i)
        if not t: continue
        e = {k: t[k] for k in ('name', 'description') if k in t}
        if o['name'] == 'Bleeding' and pack.startswith('conditions'): e['name'] = 'Bleeding'  # el código lo busca por nombre
        if 'results' in t: e['results'] = t['results']
        if pack.startswith('macros'):
            cmd = json.loads([l for l in (R/f'work/upstream/packs/{pack}.db').read_text().splitlines() if f'"{i}"' in l][0])['command']
            nuevo = cmd
            for h, es in mt.items():
                orig_p = MT[h]
                nuevo = nuevo.replace(orig_p, es)
            if nuevo != cmd: e['command'] = nuevo
        ent[i] = e
    base, ed = pack.rsplit('_', 1)
    json.dump({'label': f'{ETIQ[base]} ({ed})', 'mapping': {'description': 'system.description'} if base in ('conditions', 'items_maintenance') else {}, 'entries': ent},
              open(R/f'compendium/mosh.{pack}.json', 'w'), ensure_ascii=False, indent=1)
    print(pack, len(ent), '/', len(orig))
print('lang faltan:', len(faltan), 'literales:', len(lit))
