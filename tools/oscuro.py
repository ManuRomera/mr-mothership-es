#!/usr/bin/env python3
"""Genera estilos-oscuro.css: el modo oscuro completo de MoSh a partir de su propia hoja de estilos.
Cada regla del sistema con colores se repite bajo `body.mr-mosh-oscuro` con los colores cambiados por su papel
(fondos claros → superficies oscuras, paneles negros → gris oscuro, texto → claro, bordes negros → gris medio).
Uso: python3 tools/oscuro.py [ruta a systems/mosh/css/mosh.css]"""
import re, sys, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else R.parent.parent / 'systems/mosh/css/mosh.css')
PRE = 'body.mr-mosh-oscuro'
NOMBRES = {'white': '#ffffff', 'black': '#000000', 'grey': '#808080', 'gray': '#808080', 'lightgrey': '#d3d3d3', 'lightgray': '#d3d3d3',
           'orangered': '#ff4500', 'red': '#ff0000', 'darkgrey': '#a9a9a9', 'silver': '#c0c0c0'}
COLOR = re.compile(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:' + '|'.join(NOMBRES) + r')\b', re.I)

def rgb(c):
    c = c.lower()
    if c in NOMBRES: c = NOMBRES[c]
    if c.startswith('#'):
        h = c[1:]
        if len(h) in (3, 4): h = ''.join(x * 2 for x in h[:3])
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)), 1.0
    n = [float(x) for x in re.findall(r'[\d.]+', c)]
    return tuple(int(x) for x in n[:3]), (n[3] if len(n) > 3 else 1.0)

def luz(t): return (0.2126 * t[0] + 0.7152 * t[1] + 0.0722 * t[2]) / 255
def croma(t): return max(t) - min(t)

def nuevo(c, papel):
    t, a = rgb(c)
    L, cr = luz(t), croma(t)
    if cr > 60:  # colores con intención (rojos de aviso): se aclaran si son oscuros para leerse sobre negro
        return '#ff7a6b' if L < 0.45 else c
    if papel == 'fondo':
        v = '#1c1c1e' if L >= 0.85 else '#2a2a2d' if L >= 0.55 else '#3a3a3e' if L >= 0.25 else '#2e2e32'
    elif papel == 'texto':
        v = '#a6a6ab' if 0.3 <= L < 0.7 else '#ececee'
    else:  # bordes
        v = '#3e3e43' if L >= 0.7 else '#6e6e75'
    if a < 1:
        r, g, b = (int(v[i:i + 2], 16) for i in (1, 3, 5)); return f'rgba({r}, {g}, {b}, {a})'
    return v

def papel(prop):
    if prop.startswith('background'): return 'fondo'
    if prop in ('color', 'caret-color', '-webkit-text-fill-color'): return 'texto'
    if prop.startswith('border') or prop.startswith('outline') or prop == 'fill' or prop == 'stroke': return 'borde'
    return None

def reglas(css):
    """(at-regla, selectores, declaraciones); entra en @container/@media y salta @keyframes/@font-face."""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    i = 0
    while i < len(css):
        j = css.find('{', i)
        if j < 0: return
        cab = css[i:j].strip()
        prof, k = 1, j + 1
        while prof and k < len(css):
            prof += {'{': 1, '}': -1}.get(css[k], 0); k += 1
        cuerpo = css[j + 1:k - 1]
        if cab.startswith('@'):
            if cab.startswith(('@container', '@media')):
                for _, s, d in reglas(cuerpo): yield cab, s, d
        else: yield None, cab, cuerpo
        i = k

salida = []
for at, sel, cuerpo in reglas(re.sub(r'^@(import|include-when-export)[^;]*;', '', SRC.read_text(), flags=re.M)):
    decl = []
    for d in cuerpo.split(';'):
        if ':' not in d: continue
        prop, val = (x.strip() for x in d.split(':', 1))
        p = papel(prop.lower())
        if not p or 'url(' in val or not COLOR.search(val): continue
        decl.append(f'{prop}: {COLOR.sub(lambda m: nuevo(m.group(0), p), val.replace("!important", "").strip())} !important')
    if not decl: continue
    sels = ', '.join(f'{PRE} {s.strip()}' for s in sel.split(',') if s.strip())
    bloque = f'{sels} {{ {"; ".join(decl)}; }}'
    salida.append(f'{at} {{ {bloque} }}' if at else bloque)

# estilos en línea de las plantillas del sistema (style="background: white" etc.) y la base de ventanas y chat
BASE = f"""
{PRE} .mosh.sheet .window-content, {PRE} .macro-popup-dialog .window-content, {PRE} .mosh.sheet form {{ background: #121214 !important; color: #ececee !important; }}
{PRE} .mosh.sheet .window-header, {PRE} .macro-popup-dialog .window-header {{ background: #0b0b0c !important; color: #ececee !important; border-bottom: 1px solid #2e2e32 !important; }}
{PRE} :is(.mosh, .macro-popup-dialog) [style*="background: white"], {PRE} :is(.mosh, .macro-popup-dialog) [style*="background:white"] {{ background: #1c1c1e !important; color: #ececee !important; }}
{PRE} :is(.mosh, .macro-popup-dialog) [style*="background: black"] {{ background: #2e2e32 !important; }}
{PRE} :is(.mosh, .macro-popup-dialog) [style*="color: black"] {{ color: #ececee !important; }}
{PRE} :is(.mosh, .macro-popup-dialog) [style*="#999"], {PRE} :is(.mosh, .macro-popup-dialog) [style*="#111"] {{ border-color: #6e6e75 !important; }}
{PRE} :is(.mosh, .macro-popup-dialog) [style*="#ffffff"] {{ border-color: #3e3e43 !important; }}
{PRE} .mosh.sheet :is(input, textarea, select):not([type=radio], [type=checkbox]), {PRE} .macro-popup-dialog :is(input, textarea, select):not([type=radio], [type=checkbox]) {{ background-color: #1c1c1e !important; color: #ececee !important; border-color: #3e3e43 !important; }}
{PRE} .mosh.sheet :is(input, textarea)::placeholder {{ color: #77777d !important; }}
{PRE} .macro-popup-dialog :is(button, .dialog-button) {{ background: #2a2a2d !important; color: #ececee !important; border-color: #4a4a50 !important; }}
{PRE} .macro-popup-dialog :is(button, .dialog-button):hover {{ background: #3a3a3e !important; }}
/* casillas y puntos de elección: dibujados a mano para que el marcado se vea (el nativo oscuro apenas distingue activado de desactivado) */
{PRE} :is(.mosh, .macro-popup-dialog, .mr-a11y) :is(input[type=radio], input[type=checkbox]) {{ -webkit-appearance: none; appearance: none; width: 20px !important; height: 20px !important; min-width: 20px; margin: 0; flex: none; background: #1c1c1e !important; border: 2px solid #9a9aa2 !important; box-shadow: none; cursor: pointer; }}
{PRE} :is(.mosh, .macro-popup-dialog, .mr-a11y) input[type=radio] {{ border-radius: 50% !important; }}
{PRE} :is(.mosh, .macro-popup-dialog, .mr-a11y) input[type=checkbox] {{ border-radius: 5px !important; }}
{PRE} :is(.mosh, .macro-popup-dialog, .mr-a11y) input[type=radio]:checked {{ background: radial-gradient(circle, #ffffff 0 42%, #1c1c1e 46%) !important; border-color: #ffffff !important; }}
{PRE} :is(.mosh, .macro-popup-dialog, .mr-a11y) input[type=checkbox]:checked {{ background: #ffffff !important; border-color: #ffffff !important; box-shadow: inset 0 0 0 3px #1c1c1e !important; }}
{PRE} :is(.mosh, .macro-popup-dialog, .mr-a11y) :is(input[type=radio], input[type=checkbox]):focus-visible {{ outline: 2px solid #8ab4ff; outline-offset: 2px; }}
{PRE} :is(.mosh, .macro-popup-dialog) select {{ color-scheme: dark; }}
{PRE} .mr-gen-bio :is(button, select, textarea) {{ background: #2a2a2d !important; color: #ececee !important; border: 1px solid #5a5a62 !important; }}
{PRE} .mr-gen-bio button:hover {{ background: #3a3a3e !important; }}
/* el dado es un trazo negro sobre el fondo del propio <img>: se invierte con el fondo ya invertido para quedar líneas claras sobre disco oscuro */
{PRE} :is(.mosh, .macro-popup-dialog) img[src$="d20-black.svg"] {{ filter: invert(1); background-color: #e2e2e2 !important; border-color: #6e6e75 !important; }}
/* iconos del sistema (glifos negros sobre blanco): se invierten; el resto de imágenes conserva sus colores */
{PRE} :is(.mosh, .macro-popup-dialog) img[src*="/icons/ui/"] {{ filter: invert(1) brightness(.92); }}
/* chat */
{PRE} .chat-message {{ background: #141416 !important; border-color: #2e2e32 !important; color: #ececee !important; }}
{PRE} .chat-message :is(.message-header, .message-sender, .message-metadata, .message-metadata a, .message-content, .flavor-text, .result-text, h4) {{ color: #ececee !important; }}
{PRE} .chat-message :is(.dice-roll, .dice-result, .dice-formula, .dice-total, .dice-tooltip, .part-header, .table-draw .table-results li) {{ background: #1c1c1e !important; color: #ececee !important; border-color: #3e3e43 !important; }}
{PRE} .chat-message :is(a.inline-roll, a.content-link) {{ background: #2a2a2d !important; color: #ececee !important; border-color: #4a4a50 !important; }}
{PRE} .chat-message .table-draw img {{ filter: invert(1) brightness(.92); }}
{PRE} .mosh .mr-botones button {{ background: #2e2e32 !important; color: #ececee !important; border: 1px solid #4a4a50 !important; }}
{PRE} .mosh .mr-botones button:hover {{ background: #45454b !important; }}
{PRE} .mosh .mr-aplicado {{ border-color: #4a4a50 !important; }}
"""
(R / 'estilos-oscuro.css').write_text('/* Generado por tools/oscuro.py a partir de systems/mosh/css/mosh.css: no editar a mano */\n' + '\n'.join(salida) + BASE)
print(len(salida), 'reglas')
