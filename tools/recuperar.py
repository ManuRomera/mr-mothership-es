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
 (['katana'], 'F6'), (['pala'], 'F4'), (['pluma', 'boligrafo'], 'F11'),
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

ARMAS_ICONO = {'puos americanos': 'Unarmed', 'puenos americanos': 'Unarmed', 'hacha de madera': 'BoardingAxe', 'garrote': 'D14', 'pincho': 'F6',
               'escopeta recortada': 'F5', 'arma improvisada': 'Crowbar', 'rifle': 'F1', 'martillo a dos manos': 'F4',
               'pistola de bolsillo': 'F7', 'pistola pequena': 'F7', 'pistola compacta oculta': 'F7', 'arco': 'D13',
               'mosquete': 'F0', 'rifle antiguo': 'F0', 'rifle de caza lejano': 'F1', 'rifle antimateria': 'F2'}
HAB_ICONO = {'Botánica': 'Botany', 'Apaños técnicos': 'Jurry-Rigging', 'Equipo industrial': 'Industrial Equipment',
             'Supervivencia agreste': 'Wilderness Survival', 'Medicina de campo': 'Field Medicine'}
CLASE_ICONO = {'Marine': 'E0', 'Colono': 'E1', 'Ejecutivo': 'B5', 'Pastor': 'E2', 'Buscavidas': 'E4', 'Criminal': 'E5',
               'Psíquico': 'E6', 'Explorador': 'E7', 'Jubilado': 'B8', 'Escoria': 'E8', 'Esclavo asalariado': 'E9',
               'Atavismo': 'E10', 'Psiónico': 'E13', 'Androide': 'E11', 'Científico': 'E14', 'Tripulante': 'E12'}

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
        if 'guns_08' in img: return 'systems/mosh/images/icons/sci-fi_icons/transparent/guns/guns_08.PNG'
        return img
    if t == 'armor':
        if img.startswith('worlds/'):
            f = pathlib.Path(unicodedata.normalize('NFC', urllib.parse.unquote(img.split('/')[-1])))
            dst = R / 'iconos' / ('armadura-' + norm(f.stem).replace(' ', '-') + '.png')
            src = pathlib.Path('/Volumes/Datos_Dock/FoundryVTT/Data/worlds/another-bug-hunt/assets/Iconos') / f.name
            if src.exists(): shutil.copy(src, dst)
            return f'{ICO}{dst.name}'
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
          'Planetologia': 'Planetología', 'Robotica': 'Robótica', 'Sofontologia': 'Sofontología', 'Conocimientos del Borde exterior': 'Conocimientos del Borde Exterior'}
for h in packs['habilidades']: h['name'] = TILDES.get(h['name'], h['name'])

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
