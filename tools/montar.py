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
# claves que el sistema usa pero que su en.json no define (se verían como «Mosh.Algo») + nombres de tipos de documento
EXTRAS = {
  'MajorRepair': 'Reparación mayor', 'MinorRepair': 'Reparación menor', 'MajorRepairs': 'Reparaciones mayores',
  'ShipSetup': 'Configuración de la nave', 'RollStartingCondition': 'Tirar estado inicial', 'Finish': 'Terminar',
  'CloseMenu': 'Cerrar menú', 'MegadamageEffects': 'Efectos de megadaño',
  'OrQuarterAsDetermineByWarden': 'o un cuarto, según determine el Guardián',
  'TreesBulkheadWallsMetalFurniture': 'Árboles, mamparos, muros y muebles metálicos',
  'EditModule': 'Editar módulo', 'DeleteModule': 'Eliminar módulo', 'CreateModule': 'Crear módulo', 'CreateArmor': 'Crear armadura',
  'MAX': 'MÁX', 'CURRENT': 'ACTUAL', 'Distress': 'Socorro', 'Captain': 'Capitán',
  'EditAbility': 'Editar habilidad especial', 'DeleteAbility': 'Eliminar habilidad especial', 'CreateAbility': 'Crear habilidad especial',
  'EditCrewMember': 'Editar tripulante', 'DeleteCrewMember': 'Eliminar tripulante', 'CreateCrewMember': 'Crear tripulante',
}
for k, v in EXTRAS.items(): anid.setdefault(k, v)
anid.setdefault('CharacterGenerator', {}).setdefault('SkillOption', {}).setdefault('PopupFullExpertDescription', 'Elige 1 habilidad experta y una habilidad entrenada como requisito previo.')
TYPES = {'Actor': {'character': 'Personaje', 'creature': 'Criatura', 'ship': 'Nave'},
         'Item': {'item': 'Objeto', 'skill': 'Habilidad', 'weapon': 'Arma', 'armor': 'Armadura', 'ability': 'Habilidad especial',
                  'module': 'Módulo', 'condition': 'Condición', 'crew': 'Tripulante', 'repair': 'Reparación', 'class': 'Clase'}}
json.dump({'Mosh': anid, 'TYPES': TYPES}, open(R/'lang/es.json', 'w'), ensure_ascii=False, indent=2)

# literales: textos fijos de plantillas/JS + patrones con datos interpolados
lit = {k: v for k, v in {**juntar('literals'), **juntar('literals2')}.items() if v and v != k}
lit['Bleeding'] = 'Sangrado'
lit.update({'SUCCESS!': '¡ÉXITO!', 'FAILURE!': '¡FALLO!', 'CRITICAL SUCCESS!': '¡ÉXITO CRÍTICO!', 'CRITICAL FAILURE!': '¡FALLO CRÍTICO!',
            'to': 'a', 'Reduce the most relevant Stat or Save by': 'Reduce la Característica o Salvación más relevante en'})
lit.update({
  'Strength Check': 'Tirada de Fuerza', 'Speed Check': 'Tirada de Velocidad', 'Intellect Check': 'Tirada de Intelecto', 'Combat Check': 'Tirada de Combate',
  'Instinct Check': 'Tirada de Instinto', 'Loyalty Check': 'Tirada de Lealtad', 'Sanity Save': 'Salvación de Cordura', 'Fear Save': 'Salvación de Miedo',
  'Body Save': 'Salvación de Cuerpo', 'Armor Save': 'Salvación de Armadura', 'Thrusters Save': 'Salvación de propulsores', 'Battle Save': 'Salvación de batalla',
  'Systems Save': 'Salvación de sistemas', 'Bankruptcy Save': 'Salvación de bancarrota', 'An Ability': 'Una habilidad especial',
  'This is a description': 'Esto es una descripción', 'Net HP': 'PV netos', 'Minimum': 'Mínimo', 'Maximum': 'Máximo',
  'plus': 'más el bono de', 'skill bonus.': '.', 'points of damage.': 'puntos de daño.', 'damage': 'de daño', '1e Rules': 'Reglas de 1e',
  'You strike your target for': 'Golpeas a tu objetivo causando', 'roll': 'tirada', 'success': 'éxito', 'failure': 'fallo',
})
lit['+1 Stress'] = '+1 Estrés'
lit['-1d10 Calm'] = '-1d10 Calma'
def _etiquetas(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == 'label' and isinstance(v, str): yield v
            else: yield from _etiquetas(v)
    elif isinstance(o, list):
        for v in o: yield from _etiquetas(v)
ETIQ_CAMPOS = set(_etiquetas(json.load(open(R/'work/upstream/template.json')))) | {'Stress', 'Calm', 'Health', 'Wounds', 'Resolve'}
lit.setdefault('Calm', 'Calma'); lit.setdefault('Resolve', 'Determinación')
patrones = [
    {'en': r'^Your controlled Actor does not have an item named (.+)$', 'es': 'Tu actor controlado no tiene ningún objeto llamado $1'},
    {'en': r'^Extra wounds: (.+)$', 'es': 'Heridas extra: $1'},
    {'en': r'^Reduce the most relevant Stat or Save by (.+)$', 'es': 'Reduce en $1 la Característica o Salvación más relevante'},
    {'en': r'^Credits: (.+)$', 'es': 'Créditos: $1'},
    {'en': r'^Health: (.+)$', 'es': 'Salud: $1'},
    {'en': r'^(.+): Deckplan$', 'es': '$1: Plano de cubierta'},
    {'en': r'^(.+): Creature Settings$', 'es': '$1: Ajustes de criatura'},
    {'en': r'^(.+): Megadamage Effects$', 'es': '$1: Efectos de megadaño'},
    {'en': r'^(.+): Ship Macros$', 'es': '$1: Macros de la nave'},
    {'en': r'^(.+): Ship Setup$', 'es': '$1: Configuración de la nave'},
    {'en': r'^You (rolled|did not roll) (less than or equal to|less than|greater than or equal to|greater than) your$', 'es': '$1 $2 tu',
     'map': {'rolled': 'Has sacado', 'did not roll': 'No has sacado', 'less than': 'menos que', 'less than or equal to': 'menos o igual que',
             'greater than': 'más que', 'greater than or equal to': 'más o igual que'}},
    {'en': r'^(.*?)((?:Minimum |Maximum )?)(' + '|'.join(sorted(ETIQ_CAMPOS, key=len, reverse=True)) + r') (increased|decreased) from$', 'es': '$1$3 $2$4 de',
     'map': {'Minimum': 'mínimo', 'Maximum': 'máximo', 'increased': 'aumenta', 'decreased': 'disminuye'}},
    {'en': r'^(Minimum|Maximum) (.+)$', 'es': '$2 $1', 'map': {'Minimum': 'mínimo', 'Maximum': 'máximo'}},
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
