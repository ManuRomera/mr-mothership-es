#!/usr/bin/env python3
"""Redacta descripciones largas (ambientación, catálogo, ejemplos de interpretación) con Codex para los compendios propios
y las averías de mantenimiento. Uso: python3 tools/describir.py <categoria>   (clases|armas|armaduras|habilidades|objetos|averias)
Escribe art_src/desc/<categoria>.json {id: html}; tools/recuperar.py y tools/montar.py lo integran."""
import json, re, sys, os, subprocess, pathlib, html as H
from concurrent.futures import ThreadPoolExecutor
R = pathlib.Path(__file__).resolve().parent.parent
OUT = R / 'art_src/desc'; OUT.mkdir(parents=True, exist_ok=True)
txt = lambda s: re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()

COMUN = """Eres redactor de un juego de rol de ciencia ficción y terror (Mothership: camioneros espaciales, empresas sin escrúpulos, naves viejas, horror cósmico, humor negro).
Escribes en español de España, con frases cortas y tono de ficha de juego bien editada. Sin anglicismos innecesarios. No uses marcas reales; las empresas y fabricantes que menciones son inventados, breves y creíbles.
Responde SOLO con un objeto JSON {"<clave>": "<html>"} con TODAS las claves de la entrada. El html usa solo <p>, <strong>, <em>, <ul>, <li>. Sin markdown, sin comentarios.
No inventes reglas ni cifras que no estén en los datos: la mecánica ya está en la ficha; tú aportas ambientación y color. No repitas el nombre del objeto como primera palabra de cada texto; varía las aperturas entre entradas."""

BRIEFS = {
 'clases': COMUN + """
Para cada CLASE escribe: (1) dos párrafos de ambientación (quién es esta gente, de dónde viene, qué hace en el espacio, por qué acaba en una nave condenada), 90-130 palabras en total;
(2) <p><strong>Cómo interpretarlo.</strong> un párrafo con consejos concretos de actitud, voz y manías, y 3 frases de ejemplo entre comillas que el personaje podría decir en mitad de una crisis;
(3) <p><strong>Ganchos.</strong> una lista <ul> de 3 ganchos de trasfondo (una deuda, un secreto, una relación) que el jugador puede adoptar o ignorar.
Total 200-280 palabras. Apóyate en los bonos y la respuesta al trauma de los datos para que el texto sea coherente con la mecánica.""",
 'armas': COMUN + """
Para cada ARMA escribe una entrada de catálogo comercial/militar con humor seco: <p> de 60-95 palabras: fabricante inventado y modelo, para qué se diseñó, cómo se siente al usarla, un defecto o advertencia de seguridad ligeramente siniestra, y una frase final de eslogan de vendedor entre comillas. Si el arma es improvisada o antigua, descríbela con ese espíritu (hallada, fabricada a mano, pieza de museo).""",
 'armaduras': COMUN + """
Para cada ARMADURA o prenda escribe una entrada de catálogo de tienda o de intendencia: <p> de 55-90 palabras: fabricante o línea inventada, material, ajuste, para qué entorno está pensada, un detalle práctico y un defecto o rareza, y un eslogan final entre comillas. Si es ropa civil o de trabajo, que se note el uso y el estilo (cómoda, ridícula, gastada); si es blindaje, que huela a ingeniería y a manual de instrucciones.""",
 'habilidades': COMUN + """
Para cada HABILIDAD escribe UNA sola frase de 14-24 palabras dentro de un <p>: qué abarca y un ejemplo concreto de uso a bordo o en un planeta hostil. Debe caber en dos líneas del diálogo de tirada: nada de listas ni títulos.""",
 'objetos': COMUN + """
Para cada OBJETO o equipo escribe una entrada de catálogo/inventario: <p> de 45-80 palabras: qué es, para qué sirve a bordo, un detalle de uso o de aspecto y una complicación o rareza (un fallo típico, una anécdota). Si es un objeto personal o de ambientación (cartera, mascota, recuerdo), cuenta qué dice del dueño. Si es un animal, trátalo como compañero. Termina con una frase corta tipo eslogan o aviso.""",
 'averias': COMUN + """
Cada entrada es una AVERÍA DE MANTENIMIENTO de una nave (un problema cotidiano que sale en una tabla). Escribe <p> de 40-70 palabras que ayude al Guardián a interpretarla: qué se ve, se oye o se huele, qué causa plausible tiene, y una consecuencia o gancho de escena (una pista, una mala idea, un PNJ al que culpar). Tono de nave vieja y mal mantenida. No des reglas ni cifras.""",
}

AC = {'Pastor': 'guía espiritual y capellán religioso (en inglés Shepherd): cuida el ánimo y la fe de la tripulación; NO es ganadero ni pastor de animales',
      'Atavismo': 'persona de cultura tribal o primitiva desplazada, recelosa de la tecnología avanzada',
      'Escoria': 'marginado de los bajos fondos de estaciones y naves, superviviente de arrabal',
      'Buscavidas': 'buscavidas, estafador y oportunista que improvisa para salir adelante',
      'Jubilado': 'persona mayor retirada, con una vida entera a las espaldas, que se ha embarcado por necesidad o por capricho',
      'Psiónico': 'persona con poderes mentales entrenados y controlados', 'Psíquico': 'persona con poderes mentales inestables y poco comprendidos'}
def ctx_clases(d):
    s = d['system']; b = s['base_adjustment']
    return {'nombre': d['name'], 'aclaracion': AC.get(d['name'], ''), 'bonos': {k: v for k, v in b.items() if k != 'skills_granted' and v}, 'trauma': s.get('trauma_response'), 'descripcion_actual': txt(s.get('description'))}
def ctx_armas(d): s = d['system']; return {'nombre': d['name'], 'dano': s.get('damage'), 'cargador': s.get('shots'), 'alcance': s.get('ranges', {}).get('value'), 'reglas': txt(s.get('description'))}
def ctx_armaduras(d): s = d['system']; return {'nombre': d['name'], 'PA': s.get('armorPoints'), 'oxigeno': s.get('oxygenMax'), 'reglas': txt(s.get('description'))}
def ctx_habilidades(d): s = d['system']; return {'nombre': d['name'], 'rango': s.get('rank'), 'bono': s.get('bonus')}
def ctx_objetos(d): s = d['system']; return {'nombre': d['name'], 'coste': s.get('cost'), 'reglas': txt(s.get('description'))}
CTX = {'clases': ctx_clases, 'armas': ctx_armas, 'armaduras': ctx_armaduras, 'habilidades': ctx_habilidades, 'objetos': ctx_objetos}
BASURA = re.compile(r'^(\d+ (créditos|habilidad|psiónica)|\d+ habilidades|\d+ psiónicas)', re.I)

def entradas(cat):
    if cat == 'averias':
        d = json.load(open(R / 'compendium/mosh.items_maintenance_1e.json'))['entries']
        return {k: {'nombre': v['name']} for k, v in d.items()}
    docs = json.load(open(R / f'_data/{cat}.json'))
    return {d['_id']: CTX[cat](d) for d in docs if not BASURA.match(d['name'])}

def lote(cat, items):
    prompt = BRIEFS[cat] + '\n\nENTRADA:\n' + json.dumps(items, ensure_ascii=False, indent=1)
    for _ in range(3):
        r = subprocess.run(['codex', 'exec', '-m', 'gpt-5.6-luna', '-c', 'model_reasoning_effort="low"', '--skip-git-repo-check', prompt],
                           capture_output=True, text=True, stdin=subprocess.DEVNULL, timeout=900)
        m = re.search(r'\{.*\}', r.stdout, re.S)
        try:
            out = json.loads(m.group(0))
            if set(out) == set(items) and all(len(txt(v)) > (40 if cat == 'habilidades' else 80) for v in out.values()): return out
        except Exception: pass
    raise SystemExit(f'lote fallido en {cat}: {list(items)[:2]}')

if __name__ == '__main__':
    cat = sys.argv[1]; n = int(os.environ.get('LOTE', 14))
    todo = entradas(cat); hecho = json.load(open(OUT / f'{cat}.json')) if (OUT / f'{cat}.json').exists() else {}
    pend = [k for k in todo if k not in hecho]
    lotes = [{k: todo[k] for k in pend[i:i + n]} for i in range(0, len(pend), n)]
    with ThreadPoolExecutor(4) as ex:
        for out in ex.map(lambda l: lote(cat, l), lotes):
            hecho.update(out); json.dump(hecho, open(OUT / f'{cat}.json', 'w'), ensure_ascii=False, indent=1)
            print(cat, len(hecho), '/', len(todo), flush=True)
