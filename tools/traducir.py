#!/usr/bin/env python3
"""Reparte work/src/*.json en trozos, los traduce con opencode (DeepSeek) en paralelo y valida. Uso: traducir.py [fichero ...]"""
import os, json, re, subprocess, sys, pathlib, concurrent.futures as cf
R = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = R/'work/src', R/'work/out'; OUT.mkdir(exist_ok=True)
MODEL = 'opencode/deepseek-v4.1-flash-free'
BRIEF = (R/'tools/brief.md').read_text()
MAXC = int(os.environ.get('MAXC', 7000))  # caracteres por trozo
TOK = re.compile(r'<[^>]+>|@UUID\[[^\]]*\]|\[\[[^\]]*\]\]|\{[^}]*\}|\b\d*d\d+(?:[+-]\d+)?\b|&\w+;')

def chunks(d):
    cur, n = {}, 0
    for k, v in d.items():
        s = len(json.dumps(v, ensure_ascii=False))
        if cur and n + s > MAXC: yield cur; cur, n = {}, 0
        cur[k] = v; n += s
    if cur: yield cur

def hojas(v):
    if isinstance(v, str): yield v
    elif isinstance(v, dict):
        for x in v.values(): yield from hojas(x)

def toks(v):
    return sorted(m for s in hojas(v) for m in TOK.findall(re.sub(r'(@UUID\[[^\]]*\])\{[^}]*\}', r'\1', s)))

def check(a, b):
    if not isinstance(b, dict) or a.keys() != b.keys(): return 'claves distintas'
    for k in a:
        if toks(a[k]) != toks(b[k]): return f'marcadores alterados en {k}'
    return None

def run(name, i, part):
    f = OUT/f'{name}.{i:02d}.json'
    if f.exists(): return f
    prompt = BRIEF + '\n\nENTRADA:\n' + json.dumps(part, ensure_ascii=False, indent=1)
    for intento in range(3):
        cmd = ['codex', 'exec', '-m', 'gpt-5.6-luna', '-c', 'model_reasoning_effort="low"', '--skip-git-repo-check', prompt] if os.environ.get('MOTOR') == 'codex' else ['opencode', 'run', '-m', MODEL, prompt]
        r = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL, timeout=600)
        m = re.search(r'\{.*\}', r.stdout, re.S)
        try:
            out = json.loads(m.group(0))
            err = check(part, out)
        except Exception as e:
            err = f'JSON inválido: {e}'
        if not err:
            json.dump(out, open(f, 'w'), ensure_ascii=False, indent=1); return f
        print(f'  reintento {name}.{i}: {err}', flush=True)
    print(f'FALLO {name}.{i}', flush=True)

if __name__ == '__main__':
    names = sys.argv[1:] or [p.stem for p in sorted(SRC.glob('*.json')) if p.stem != 'patterns']
    jobs = []
    for n in names:
        d = json.load(open(SRC/f'{n}.json'))
        if isinstance(d, list): d = {s: s for s in d}
        jobs += [(n, i, p) for i, p in enumerate(chunks(d))]
    print(len(jobs), 'trozos')
    with cf.ThreadPoolExecutor(6) as ex:
        list(ex.map(lambda j: run(*j), jobs))
