#!/usr/bin/env python3
"""Genera con Codex las reservas de texto del generador de nombres y biografías: lang/personajes.json.
Formas con género: {o|a|e} = masculino|femenino|neutro (se elige según el sexo escogido en el generador)."""
import json, re, subprocess, pathlib
from concurrent.futures import ThreadPoolExecutor
R = pathlib.Path(__file__).resolve().parent.parent
CLASES = [c['name'] for c in json.load(open(R / '_data/clases.json'))]
MOD = 'gpt-5.6-luna'
import sys, os
sys.path.insert(0, str(R / 'tools'))
from describir import AC

def codex(prompt, validar):
    for _ in range(3):
        r = subprocess.run(['codex', 'exec', '-m', MOD, '-c', 'model_reasoning_effort="low"', '--skip-git-repo-check', prompt],
                           capture_output=True, text=True, stdin=subprocess.DEVNULL, timeout=900)
        m = re.search(r'\{.*\}', r.stdout, re.S)
        try:
            out = json.loads(m.group(0))
            if validar(out): return out
        except Exception: pass
    raise SystemExit('fallo: ' + prompt[:80])

P_NOMBRES = """Para un juego de rol de ciencia ficción y terror ambientado en el futuro (camioneros espaciales, colonias, empresas), da listas de nombres variados y creíbles, mezcla de orígenes (español e hispanoamericano, anglosajón, eslavo, árabe, asiático, africano...), sin personajes famosos ni nombres de marcas.
Responde SOLO con JSON: {"m": [110 nombres masculinos], "f": [110 nombres femeninos], "x": [45 nombres neutros o ambiguos válidos para cualquiera], "apellidos": [180 apellidos], "alias": [90 motes o apodos de tripulante espacial en español, cortos, con gracia: «Chispas», «Tuerca», «Doña Calma»...]}. Sin repetidos."""

P_CLASE = """Eres guionista de un juego de rol de ciencia ficción y terror (Mothership: camioneros espaciales, empresas sin escrúpulos, naves viejas, horror cósmico, humor negro). Español de España.
Para cada CLASE de la entrada escribe reservas de frases para componer biografías de personajes jugadores. Cada frase va en tercera persona, sin nombre propio (el sujeto está sobreentendido), es autosuficiente, concreta y original, 10-24 palabras, tono de ficha bien escrita. Nada de frases genéricas que valgan para cualquier clase: que huelan a ESA clase.
Las frases deben servir para cualquier sexo: usa formas neutras cuando puedas, y cuando haga falta marcar género usa la forma {o|a|e} (masculino|femenino|neutro) en el propio sufijo, p. ej. «criad{o|a|e} en una colonia minera», «convencid{o|a|e}». No uses «el/la» sueltos; reescribe la frase para evitarlo.
Responde SOLO con JSON {"<clase>": {"origen":[10], "trayectoria":[10], "motivacion":[10], "mania":[10], "miedo":[8], "secreto":[8], "relacion":[8], "frase":[10], "alias":[8]}} con todas las claves.
- origen: dónde/cómo creció. - trayectoria: qué hizo antes y cómo acabó a bordo de esta nave. - motivacion: qué quiere de verdad. - mania: hábito o rareza visible. - miedo: a qué teme (algo que el Guardián pueda usar). - secreto: algo que oculta. - relacion: vínculo con otra persona o entidad (no nombres propios, di «un antiguo compañero...»). - frase: una frase que diría entre comillas latinas «». - alias: motes cortos propios de la clase (2-3 palabras como máximo)."""

def validar_clases(nombres):
    claves = {'origen': 10, 'trayectoria': 10, 'motivacion': 10, 'mania': 10, 'miedo': 8, 'secreto': 8, 'relacion': 8, 'frase': 10, 'alias': 8}
    return lambda o: set(o) == set(nombres) and all(len(o[c].get(k, [])) >= n - 1 for c in o for k, n in claves.items())

if __name__ == '__main__':
    solo = [c for c in os.environ.get('SOLO', '').split(',') if c]
    trozos = [solo] if solo else [CLASES[i:i + 3] for i in range(0, len(CLASES), 3)]
    with ThreadPoolExecutor(4) as ex:
        f_nombres = None if solo else ex.submit(codex, P_NOMBRES, lambda o: len(o.get('m', [])) > 80 and len(o.get('f', [])) > 80 and len(o.get('x', [])) > 30 and len(o.get('apellidos', [])) > 120)
        f_clases = [ex.submit(codex, P_CLASE + '\n\nENTRADA: ' + json.dumps(t, ensure_ascii=False) + '\nACLARACIONES de clases: ' + json.dumps({c: AC[c] for c in t if c in AC}, ensure_ascii=False), validar_clases(t)) for t in trozos]
        out = json.load(open(R / 'lang/personajes.json')) if solo else {'nombres': f_nombres.result(), 'clases': {}}
        for f in f_clases: out['clases'].update(f.result())
    json.dump(out, open(R / 'lang/personajes.json', 'w'), ensure_ascii=False, indent=1)
    print('clases', len(out['clases']), 'apellidos', len(out['nombres']['apellidos']))
