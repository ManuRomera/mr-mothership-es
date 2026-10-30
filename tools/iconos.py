#!/usr/bin/env python3
"""Recorta los pictogramas de art_src/<hoja>.png (generados con Z-Image: siluetas blancas sobre negro, cuadrícula 4x4)
y los monta sobre el panel oscuro con hexágonos y borde blanco de los iconos «dark-grey» de Mothership.
Salida: iconos/<hoja><n>.webp (256 px). Solo se exportan las celdas listadas en USADAS."""
import pathlib, math
from PIL import Image, ImageDraw, ImageChops
R = pathlib.Path(__file__).resolve().parent.parent
USADAS = {
 'A': [0,1,2,3,4,5,6,7,9,10,12,14,15],
 'B': list(range(16)),
 'C': [0,1,2,3,4,5,6,7,8,9,10,12,13,14,15],
 'D': [0,1,2,3,4,5,6,7,8,9,10,11,13,14],
 'E': list(range(16)),
 'F': [0,1,2,4,5,6,7,8,9,10,11,12,13,14,15],
 'G': [0,1,2,3,4,5,6,7,9,10,11,12,13,14,15],
 'H': [0,1,2,3,4,6,7,8,10,11,13,14,15],
}
S = 512

def panel():
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, S - 1, S - 1), 40, fill=(255, 255, 255, 255))
    d.rounded_rectangle((14, 14, S - 15, S - 15), 30, fill=(42, 44, 43, 255))
    hexl = Image.new('RGBA', (S, S), (0, 0, 0, 0)); h = ImageDraw.Draw(hexl)
    r = 62
    for row in range(-1, 9):
        for col in range(-1, 8):
            cx = col * r * 1.732 + (r * 0.866 if row % 2 else 0); cy = row * r * 1.5
            pts = [(cx + r * math.cos(math.radians(60 * k + 30)), cy + r * math.sin(math.radians(60 * k + 30))) for k in range(6)]
            h.line(pts + [pts[0]], fill=(255, 255, 255, 14), width=3)
    mask = Image.new('L', (S, S), 0); ImageDraw.Draw(mask).rounded_rectangle((14, 14, S - 15, S - 15), 30, fill=255)
    hexl.putalpha(ImageChops.multiply(hexl.getchannel('A'), mask))
    return Image.alpha_composite(im, hexl)

BASE = panel()

def celda(hoja, n):
    im = Image.open(R / f'art_src/{hoja}.png').convert('L'); c = im.width // 4
    x, y = (n % 4) * c, (n // 4) * c
    g = im.crop((x + 6, y + 6, x + c - 6, y + c - 6)).point(lambda v: 0 if v < 40 else min(255, int((v - 40) * 1.5)))
    return g.crop(g.getbbox())

def montar(hoja, n):
    g = celda(hoja, n); lado = 330
    k = lado / max(g.size); g = g.resize((max(1, int(g.width * k)), max(1, int(g.height * k))), Image.LANCZOS)
    cap = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    blanco = Image.new('RGBA', g.size, (250, 250, 250, 255)); blanco.putalpha(g)
    cap.paste(blanco, ((S - g.width) // 2, (S - g.height) // 2), blanco)
    return Image.alpha_composite(BASE, cap).resize((256, 256), Image.LANCZOS)

if __name__ == '__main__':
    out = R / 'iconos'; out.mkdir(exist_ok=True)
    for h, ns in USADAS.items():
        for n in ns: montar(h, n).save(out / f'{h}{n}.webp', quality=88)
    print(len(list(out.glob('*.webp'))), 'iconos')
