#!/usr/bin/env python3
"""Superpone título y marca MR- sobre art_src/banner_raw.png -> docs/img/banner.webp"""
from PIL import Image, ImageDraw, ImageFont
import pathlib
R = pathlib.Path(__file__).resolve().parent.parent
im = Image.open(R/'art_src/banner_raw.png').convert('RGB'); W, H = im.size
sombra = Image.new('L', (W, H), 0); d = ImageDraw.Draw(sombra)
for x in range(int(W*.62)): d.line([(x, 0), (x, H)], fill=int(190*(1-x/(W*.62))**1.4))
im.paste((4, 10, 12), mask=sombra)
d = ImageDraw.Draw(im)
def f(n, s, i=0):
    return ImageFont.truetype(n, s, index=i)
tit = f('/System/Library/Fonts/Avenir Next Condensed.ttc', int(H*.17), 8)
sub = f('/System/Library/Fonts/Avenir Next Condensed.ttc', int(H*.085), 5)
peq = f('/System/Library/Fonts/Menlo.ttc', int(H*.026))
x, y = int(W*.05), int(H*.34)
d.text((x, y-int(H*.12)), '> TRADUCCIÓN NO OFICIAL · FOUNDRY VTT', font=peq, fill=(224, 145, 58))
d.text((x, y), 'MOTHERSHIP', font=tit, fill=(236, 244, 238))
d.text((x+4, y+int(H*.19)), 'EN ESPAÑOL', font=sub, fill=(120, 230, 150))
d.text((x+4, y+int(H*.34)), 'Interfaz · hojas · chat · compendios 0e y 1e', font=peq, fill=(190, 205, 200))
mono = Image.open(R/'../mr-nadir/brand/MR_11_Formal_Marfil_Transparente.png').convert('RGBA')
mono.thumbnail((int(W*.12), int(H*.12))); im.paste(mono, (x, H-mono.height-int(H*.05)), mono)
(R/'docs/img').mkdir(parents=True, exist_ok=True)
im.save(R/'docs/img/banner.webp', quality=88)
