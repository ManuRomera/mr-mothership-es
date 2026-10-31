#!/usr/bin/env python3
"""Convierte la aventura «Básicos de Mosh» (art_src/basicos-aventura.json, volcado del compendio local de Manu) en packs
reales de Item / RollTable / JournalEntry (_data/<pack>.json) y asigna iconos al estilo Mothership.
Las clases solo las ve el generador de personajes si están en un compendio de Item, no dentro de una Aventura.
Después: node scripts/build.mjs"""
import json, re, pathlib, unicodedata, shutil, sys, urllib.parse
R = pathlib.Path(__file__).resolve().parent.parent
ID = 'mr-mothership-es'
A = json.load(open(R / 'art_src/basicos-aventura.json'))
ICO = f'modules/{ID}/iconos/'
norm = lambda s: re.sub(r'[^a-z0-9 ]', '', unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode()).strip()

PACK_DE = {'class': 'clases', 'skill': 'habilidades', 'weapon': 'armas', 'armor': 'armaduras', 'item': 'objetos'}
carpetas = {f['_id']: f for f in A['folders']}

def pack_de(it):
    if it['type'] == 'item' and carpetas.get(it.get('folder'), {}).get('name') == 'Parches': return 'parches'
    return PACK_DE[it['type']]
pack_por_id = {i['_id']: pack_de(i) for i in A['items']}
tabla_ids = {t['_id'] for t in A['tables']}

def uu(m):
    tipo, i = m.group(1), m.group(2)
    if tipo == 'Item' and i in pack_por_id: return f'Compendium.{ID}.{pack_por_id[i]}.Item.{i}'
    if tipo == 'RollTable' and i in tabla_ids: return f'Compendium.{ID}.tablas.RollTable.{i}'
    return m.group(0)
def reescribir(o):
    return json.loads(re.sub(r'(?<![\w.])(Item|RollTable)\.([A-Za-z0-9]{16})', uu, json.dumps(o, ensure_ascii=False)))

# ---- iconos -------------------------------------------------------------------------------------------------
def g(k): return f'{ICO}{k}.webp'
REGLAS_OBJETO = [  # (palabras clave, glifo de iconos/); gana la primera coincidencia
 (['creditos', 'cupones', 'privilegio', 'obscena', 'moneda', 'cubo', 'cepillos', 'pelota'], 'C8'),
 (['psionica'], 'E13'), (['habilidad'], 'E12'),
 (['vacuna', 'estimulante', 'automed', 'desfibrilador', 'cocaina', 'opio', 'drogas'], 'A1'),
 (['botiquin', 'kit de parches', 'camilla', 'escaner medico'], 'A0'),
 (['pildoras', 'pastillas', 'analgesicos', 'antirradiacion', 'hierbas', 'cafeina'], 'A2'),
 (['libro sagrado', 'santa', 'sagrad', 'medallon', 'bendita', 'oraci', 'ordenacion', 'idolo', 'plegarias', 'panfletos religiosos', 'consagrada'], 'D8'),
 (['incienso', 'aceites rituales'], 'D10'),
 (['tarjeta', 'id corporativo', 'placa', 'billete'], 'C10'),
 (['documentos', 'carta', 'panfleto', 'portapapeles', 'archivador', 'talonario', 'mapa', 'diccionario', 'wikipedia', 'bloc', 'certificado', 'diario'], 'C9'),
 (['linterna'], 'A3'), (['luz quimica'], 'C5'), (['baliza', 'localizador'], 'C6'),
 (['contador geiger'], 'C2'), (['escaner', 'bioescaner', 'kit de recogida'], 'A10'),
 (['comunic', 'radio', 'auricular', 'microfono', 'inhibidor', 'smartlink', 'smart-link', 'hud'], 'A5'),
 (['mochila', 'planeador'], 'A7'), (['maletin', 'maleta', 'cartera'], 'A12'),
 (['tanque'], 'A4'), (['respirador', 'rebreather', 'mascara'], 'C7'),
 (['paracord', 'paracordel', 'correa', 'bridas', 'cuerda'], 'A6'),
 (['binoculares', 'infrarrojas'], 'A9'), (['gafas', 'aviador'], 'D9'),
 (['terminal', 'computadora', 'rompedor'], 'C0'), (['dron'], 'C1'), (['camara'], 'D2'), (['reloj'], 'D3'),
 (['cinta adhesiva'], 'C3'), (['herramientas', 'cinturon', 'ganzuas', 'cuter', 'alargador'], 'C4'),
 (['explosiv', 'detonador'], 'D0'), (['acido', 'frasco', 'quimic', 'perfume'], 'D1'),
 (['camping', 'trampa'], 'D5'), (['cantimplora', 'agua', 'filtracion'], 'D6'),
 (['fideos'], 'F12'), (['cafe', 'fiambrera'], 'F8'), (['raciones'], 'D7'),
 (['whisky', 'ginebra', 'alcohol', 'cerveza', 'champan', 'coctel', 'botella', 'petaca'], 'F10'),
 (['baraja'], 'A15'), (['dados'], 'E4'),
 (['gato', 'mascota', 'lemur', 'cabra', 'familiares'], 'C14'), (['perro'], 'C15'), (['raton'], 'E8'),
 (['corbata'], 'B5'), (['camisa', 'camiseta'], 'B10'), (['chaleco'], 'B7'), (['ropa'], 'B0'),
 (['brazo cibernetico', 'mmu', 'aeroshell', 'propulsora'], 'B6'),
 (['extintor'], 'H4'), (['bandana'], 'H6'), (['pipa'], 'H7'), (['carro de mano'], 'H8'), (['gorro de chef'], 'H10'), (['cuerno'], 'H11'), (['poster'], 'H13'), (['entradas'], 'H14'), (['llaves'], 'H15'), (['manta de mylar'], 'H3'), (['cigarrillos', 'chicle'], 'G12'), (['mechero'], 'G13'), (['katana'], 'F6'), (['pala'], 'F4'), (['pluma', 'boligrafo'], 'F11'),
]
def glifo_objeto(nombre):
    n = norm(nombre)
    for ks, k in REGLAS_OBJETO:
        if any(norm(x) in n for x in ks): return k
    return 'D4'

REGLAS_ARMADURA = [
 (['laboratorio', 'hospital'], 'B1'), (['harapos', 'jirones', 'remendada', 'hawaiana', 'chillona'], 'B10'),
 (['frio', 'vaquera', 'gabardina'], 'B12'), (['lluvia'], 'B9'), (['corporativa', 'negocios', 'elegante', 'conjunto'], 'B5'),
 (['descanso', 'jersey', 'chandal', 'tunica', 'vestiduras'], 'B8'), (['psi', 'recuperada', 'antigua', 'brigantina'], 'B6'),
 (['mono', 'trabajo'], 'B0'), (['camisa', 'viaje', 'civil', 'negra'], 'B15'),
]
def glifo_armadura(nombre):
    n = norm(nombre)
    for ks, k in REGLAS_ARMADURA:
        if any(x in n for x in ks): return k
    return 'B0'

ARMAS_ICONO = {'puos americanos': 'G1', 'puenos americanos': 'G1', 'puos': 'G1', 'hacha de madera': 'BoardingAxe', 'garrote': 'D14', 'pincho': 'F6',
               'escopeta recortada': 'F5', 'arma improvisada': 'Crowbar', 'rifle': 'F1', 'martillo a dos manos': 'F4',
               'pistola de bolsillo': 'F7', 'pistola pequena': 'F7', 'pistola compacta oculta': 'F7', 'arco': 'G0',
               'mosquete': 'F0', 'rifle antiguo': 'F0', 'rifle de caza lejano': 'F1', 'rifle antimateria': 'F2'}
HAB_ICONO = {'Botánica': 'Botany', 'Apaños técnicos': 'Jurry-Rigging', 'Equipo industrial': 'Industrial Equipment',
             'Supervivencia agreste': 'Wilderness Survival', 'Medicina de campo': 'Field Medicine'}
CLASE_ICONO = {'Marine': 'E0', 'Colono': 'E1', 'Ejecutivo': 'B5', 'Pastor': 'E2', 'Buscavidas': 'E4', 'Criminal': 'E5',
               'Psíquico': 'E6', 'Explorador': 'E7', 'Jubilado': 'B8', 'Escoria': 'E8', 'Esclavo asalariado': 'E9',
               'Atavismo': 'E10', 'Psiónico': 'E13', 'Androide': 'E11', 'Científico': 'E14', 'Tripulante': 'E12'}

ARMADURA_FIJA = {'atuendo estandar de la tripulacion': 'G3', 'ropa de trabajo pesada': 'G5', 'traje de batalla avanzado': 'G4', 'traje de batalla estandar': 'G6',
                 'traje de peligro biologico': 'H0', 'traje de vacio': 'H2', 'uniforme': 'G10'}
def icono(it, parche_n=None):
    t, n, img = it['type'], it['name'], it['img']
    if t == 'class': return g(CLASE_ICONO.get(n, 'E12'))
    if t == 'skill':
        if 'Skill.png' in img:
            if n == 'Saber corporativo': return g('E9')
            if n == 'Psiónica': return g('E13')
            return f'systems/mosh/images/icons/dark-grey/skills/{HAB_ICONO.get(n, "Skill")}.png'
        return img
    if t == 'weapon':
        if 'svg' in img:
            k = ARMAS_ICONO.get(norm(n), 'F6')
            return g(k) if re.match(r'^[A-F]\d+$', k) else f'systems/mosh/images/icons/dark-grey/weapons/{k}.png'
        if 'guns_08' in img: return g('G2')
        return img
    if t == 'armor':
        if norm(n) in ARMADURA_FIJA: return g(ARMADURA_FIJA[norm(n)])
        return g(glifo_armadura(n)) if 'svg' in img else img
    if t == 'item':
        if parche_n is not None: return f'modules/{ID}/parches/{parche_n:02d}.webp'
        return g(glifo_objeto(n)) if 'svg' in img else img
    return img

# ---- documentos ---------------------------------------------------------------------------------------------
parche_de = {}
for t in A['tables']:
    if t['name'] == 'PARCHES':
        for r in t['results']:
            m = re.search(r'@UUID\[Item\.(\w{16})\]', r['description'])
            if m: parche_de[m.group(1)] = r['range'][0]

def limpio(d):
    d = {k: v for k, v in d.items() if k not in ('_stats', 'ownership')}
    d['flags'] = {ID: {'recuperado': True}}
    d.setdefault('effects', [])
    return d

packs = {p: [] for p in ['clases', 'habilidades', 'armas', 'armaduras', 'objetos', 'parches']}
carp_hab = {f['_id']: {'_id': f['_id'], 'name': f['name'], 'type': 'Item', 'folder': None, 'sorting': 'a', 'sort': 0, 'color': None, 'flags': {}}
            for f in A['folders'] if f['name'] in ('Entrenadas', 'Expertas', 'Maestras')}
for it in A['items']:
    d = limpio(reescribir(it)); p = pack_de(it)
    d['img'] = icono(it, parche_de.get(it['_id']))
    d['folder'] = it.get('folder') if it.get('folder') in carp_hab else None
    packs[p].append(d)

# nombres de habilidad sin tildes en el original de Manu: se corrigen (los ids no cambian)
TILDES = {'Arqueologia': 'Arqueología', 'Botanica': 'Botánica', 'Geologia': 'Geología', 'Gravedad Cero': 'Gravedad cero', 'Matematicas': 'Matemáticas',
          'Quimica': 'Química', 'Reparacion': 'Reparación', 'Teologia': 'Teología', 'Zoologia': 'Zoología', 'Ecologia': 'Ecología',
          'Farmacologia': 'Farmacología', 'Fisica': 'Física', 'Mecanica': 'Mecánica', 'Mineria espacial': 'Minería espacial',
          'Patologia': 'Patología', 'Psicologia': 'Psicología', 'Cibernetica': 'Cibernética', 'Cirugia': 'Cirugía',
          'Exobiologia': 'Exobiología', 'Ingenieria': 'Ingeniería', 'Inteligencia Artificial': 'Inteligencia artificial',
          'Planetologia': 'Planetología', 'Robotica': 'Robótica', 'Sofontologia': 'Sofontología', 'Conocimientos del Borde exterior': 'Conocimientos del Borde Exterior', 'Lingüista': 'Lingüística'}
for h in packs['habilidades']: h['name'] = TILDES.get(h['name'], h['name'])

# poderes psiónicos propios: las tablas de equipo de Psiónico y Psíquico dan «N psiónicas» (poderes a elegir, distintos).
# Son habilidades entrenadas marcadas con flags.psionica: el generador las excluye de las elecciones normales y las ofrece aparte.
import hashlib
PODERES = [('Telepatía', 'Oyes pensamientos superficiales y puedes enviar mensajes mentales a quien veas o conozcas.'),
           ('Telequinesis', 'Mueves objetos con la mente sin tocarlos; cuanto más pesados, más te cuesta.'),
           ('Clarividencia', 'Ves lo que ocurre en un lugar lejano u oculto, como si estuvieras allí.'),
           ('Precognición', 'Atisbas el futuro inmediato: una puerta que se abrirá, un disparo que está a punto de llegar.'),
           ('Psicometría', 'Al tocar un objeto o un cadáver lees su historia reciente y las emociones que guarda.'),
           ('Empatía', 'Percibes las emociones de quien tienes cerca y puedes apaciguarlas o avivarlas.'),
           ('Sugestión', 'Plantas una idea sencilla en una mente débil; el objetivo cree que fue suya.'),
           ('Sanación psíquica', 'Estabilizas a un herido y frenas su sangrado concentrando tu mente en la suya.'),
           ('Descarga mental', 'Lanzas un golpe mental que aturde a una criatura con mente e ignora la armadura.'),
           ('Escudo mental', 'Cierras tu mente a intrusiones, lecturas y señales ajenas durante unos instantes.')]
_psi = next(h for h in packs['habilidades'] if h['name'] == 'Psiónica')
for n, d in PODERES:
    p = json.loads(json.dumps(_psi))
    p.update({'_id': hashlib.md5(f'psionica-{n}'.encode()).hexdigest()[:16], 'name': f'Psiónica: {n}', 'folder': None, 'flags': {ID: {'psionica': True}}})
    p['system'].update({'rank': 'Trained', 'bonus': 0, 'prerequisite_ids': [],
                        'description': f'<p>{d}</p><p><em>Poder psiónico: lo que sabes hacer. Para usarlo tira con la habilidad <strong>Psiónica</strong> (+20); sin bono propio. Coste de estrés según el grado de tu clase (1/2/3).</em></p>'})
    packs['habilidades'].append(p)

# árbol de habilidades de la hoja de personaje oficial (Mothership 1e): requisitos previos de cada experta y maestra.
# El sistema filtra con system.prerequisite_ids (UUID completos) y exige tener al menos uno de ellos.
PRE = {
 'Psicología': ['Lingüística', 'Zoología', 'Botánica'], 'Patología': ['Zoología', 'Botánica'], 'Medicina de campo': ['Zoología', 'Botánica'],
 'Ecología': ['Botánica', 'Geología'], 'Minería espacial': ['Geología', 'Equipo industrial'], 'Mecánica': ['Equipo industrial', 'Reparación'],
 'Explosivos': ['Reparación', 'Química', 'Entrenamiento militar'], 'Farmacología': ['Química'], 'Hackeo': ['Computadoras'],
 'Pilotar': ['Gravedad cero'], 'Física': ['Matemáticas'], 'Misticismo': ['Arte', 'Arqueología', 'Teología'],
 'Supervivencia': ['Botánica', 'Entrenamiento militar'], 'Armas de fuego': ['Entrenamiento militar', 'Conocimientos del Borde Exterior'],
 'Combate cuerpo a cuerpo': ['Entrenamiento militar', 'Conocimientos del Borde Exterior', 'Atletismo'],
 # habilidades propias de clase (no salen en la hoja oficial; requisitos razonables)
 'Apaños técnicos': ['Reparación', 'Equipo industrial'],
}
PRE_MAESTRA = {
 'Sofontología': ['Psicología'], 'Exobiología': ['Patología'], 'Cirugía': ['Patología', 'Medicina de campo'], 'Planetología': ['Ecología', 'Minería espacial'],
 'Robótica': ['Mecánica'], 'Ingeniería': ['Mecánica'], 'Cibernética': ['Mecánica'], 'Inteligencia artificial': ['Hackeo'],
 'Hiperespacio': ['Pilotar', 'Física', 'Misticismo'], 'Xenoesoterismo': ['Misticismo'], 'Mando': ['Pilotar', 'Armas de fuego'],
 # de clase
 'Equipo industrial': ['Mecánica', 'Minería espacial'], 'Saber corporativo': ['Psicología', 'Hackeo'], 'Psiónica': ['Misticismo', 'Psicología'],
 'Supervivencia agreste': ['Supervivencia', 'Ecología'], 'Medicina de campo': ['Medicina de campo', 'Patología'],
}
def _uuid(nombre, rango):
    for h in packs['habilidades']:
        if h['name'] == nombre and h['system']['rank'] == rango: return f'Compendium.{ID}.habilidades.Item.{h["_id"]}'
    raise KeyError((nombre, rango))
for h in packs['habilidades']:
    rango = h['system']['rank']
    if rango == 'Expert':
        h['system']['prerequisite_ids'] = [_uuid(n, 'Trained') for n in PRE.get(h['name'], [])] if h['name'] != 'Botánica' else [_uuid('Botánica', 'Trained')]
    elif rango == 'Master':
        h['system']['prerequisite_ids'] = [_uuid(n, 'Expert') for n in PRE_MAESTRA[h['name']]]
    else: h['system']['prerequisite_ids'] = []
    if rango != 'Trained' and not h['system']['prerequisite_ids']: raise SystemExit(f'sin requisitos: {h["name"]}')

# las cuatro clases de la hoja oficial: las habilidades de bonificación son exactamente las de la hoja
# (Marine/Androide: 1 experta O 2 entrenadas; Científico: 1 maestra con requisitos + 1 entrenada + 1 experta; Tripulante: 1 entrenada + 1 experta).
# «experta» suelta = una experta cuyo requisito ya se tiene; no se regala el requisito.
def _vacio(**k): return {'trained': 0, 'expert': 0, 'expert_full_set': 0, 'master': 0, 'master_full_set': 0, **k}
for c in packs['clases']:
    sel = c['system']['selected_adjustment']
    if c['name'] in ('Marine', 'Androide'):
        sel['choose_skill_or'] = [[{'name': '1 habilidad experta', 'from_list': [], **_vacio(expert=1)}, {'name': '2 habilidades entrenadas', 'from_list': [], **_vacio(trained=2)}]]
    elif c['name'] == 'Científico': sel['choose_skill_and'] = _vacio(trained=1, expert=1, master_full_set=1)
    elif c['name'] == 'Tripulante': sel['choose_skill_and'] = _vacio(trained=1, expert=1)
    # Psiónico (adaptación de «Psions & Psionics»): solo traía Psiónica (maestra) y acababa con una única habilidad.
    # Recibe la base del árbol como el Tripulante: 1 entrenada + 1 experta con su requisito (Teología→Misticismo, Lingüística→Psicología...).
    elif c['name'] == 'Psiónico': sel['choose_skill_and'] = _vacio(trained=1, expert=1)

# tipo de herida (tabla) de cada arma: las que no lo traían, o lo traían en un formato que el sistema no entiende
HERIDA_ARMA = {'Rifle de caza lejano': 'Gunshot', 'Mosquete': 'Gunshot', 'Rifle': 'Gunshot', 'Pistola pequeña': 'Gunshot', 'Pistola compacta oculta': 'Gunshot',
               'Escopeta recortada': 'Gunshot', 'Rifle antiguo [-]': 'Gunshot', 'Pistola de bolsillo': 'Gunshot', 'Arco': 'Bleeding',
               'Martillo a dos manos': 'Blunt Force [+]', 'Puños americanos': 'Blunt Force', 'Garrote': 'Blunt Force', 'Arma improvisada': 'Blunt Force',
               'Pincho': 'Bleeding', 'Hacha de madera': 'Bleeding [+]', 'Cortadora láser': 'Bleeding [+] or Gore & Massive [+]', 'Vibechete': 'Bleeding or Gore & Massive'}

# erratas de nombres (tildes y mayúsculas iniciales) en armas, armaduras y objetos
NOMBRES = {'Revolver': 'Revólver', 'traje de vacio': 'Traje de vacío', 'Traje de peligro biologico': 'Traje de peligro biológico',
           'Cinturon de herramientes variadas': 'Cinturón de herramientas variadas', 'Dispositivo de Filtración de Agua': 'Dispositivo de filtración de agua',
           'Pistola de Espuma': 'Pistola de espuma', 'Pistola Tranquilizante': 'Pistola tranquilizante', 'Llave Inglesa': 'Llave inglesa',
           'Raciones Batalla': 'Raciones de batalla', 'Respirador Reciclador': 'Respirador reciclador', 'Botiquín de primeros auxilios': 'Botiquín de primeros auxilios'}
for cat in ('armas', 'armaduras', 'objetos'):
    for d in packs[cat]:
        n = NOMBRES.get(d['name'], d['name']); d['name'] = n[:1].upper() + n[1:]
        if cat == 'armas' and d['name'] in HERIDA_ARMA: d['system']['woundEffect'] = HERIDA_ARMA[d['name']]

# descripciones largas redactadas con tools/describir.py (la regla original se conserva debajo)
def interior(h): return re.sub(r'^<p>|</p>$', '', (h or '').strip())
for cat, docs in packs.items():
    f = R / f'art_src/desc/{cat}.json'
    if not f.exists(): continue
    desc = json.load(open(f))
    for d in docs:
        nuevo = desc.get(d['_id'])
        if not nuevo: continue
        orig = interior(d['system'].get('description'))
        if cat == 'clases': d['system']['description'] = (f'<p><em>{orig}</em></p>' if orig else '') + nuevo
        else: d['system']['description'] = nuevo + (f'<p><strong>Reglas.</strong> {orig}</p>' if orig and norm(re.sub(r'<[^>]+>', '', orig)) not in norm(re.sub(r'<[^>]+>', '', nuevo)) else '')

# la Psiónica genérica es la tirada de todos los poderes; cada poder es solo «lo que sabes hacer» (bono 0)
for h in packs['habilidades']:
    if h['name'] == 'Psiónica': h['system']['description'] += '<p><em>Es la habilidad con la que tiras al usar cualquiera de tus poderes psiónicos (Telepatía, Telequinesis…).</em></p>'

tablas = []
for t in A['tables']:
    d = limpio(reescribir(t)); d['folder'] = None
    for r in d['results']:
        r['flags'] = {}; r.pop('_stats', None)
    tablas.append(d)

diario = [limpio(reescribir(j)) for j in A['journal']]
for j in diario:
    j['folder'] = None
    for pg in j['pages']: pg.pop('_stats', None)

salida = {**packs, 'tablas': tablas, 'reglas': diario, 'carpetas-habilidades': list(carp_hab.values())}
(R / '_data').mkdir(exist_ok=True)
for k, v in salida.items():
    json.dump(v, open(R / f'_data/{k}.json', 'w'), ensure_ascii=False, indent=1)
    print(k, len(v))
