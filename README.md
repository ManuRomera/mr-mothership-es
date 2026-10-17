<p align="center">
  <img src="docs/img/banner.webp" alt="MR- Mothership en español: traducción del sistema MoSh para Foundry VTT" width="100%">
</p>

<p align="center">
  <a href="https://github.com/ManuRomera/mr-mothership-es/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/ManuRomera/mr-mothership-es?style=for-the-badge&color=78e696&label=release"></a>
  <img alt="Foundry VTT v13" src="https://img.shields.io/badge/Foundry%20VTT-v13-57d8c8?style=for-the-badge">
  <a href="https://github.com/ManuRomera/mr-mothership-es/releases"><img alt="Downloads" src="https://raw.githubusercontent.com/ManuRomera/ManuRomera/main/badges/descargas/mr-mothership-es.svg"></a>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-2b3245?style=for-the-badge"></a>
</p>

<h3 align="center">El sistema MoSh de Foundry, completo en español de España.<br>Para que lo único que dé miedo en la mesa sea la nave.</h3>

---

## ⚡ Instalación en 10 segundos

Necesitas el sistema **MoSh – Unofficial Mothership** (`mosh`) y el módulo **Babele**. En Foundry: **Add-on Modules → Install Module → Manifest URL**, pega:

```
https://github.com/ManuRomera/mr-mothership-es/releases/latest/download/module.json
```

Activa **MR- Mothership en español** en tu mundo y pon Foundry en **Español** (Configuración → Idioma). Nada más.

## 📦 Qué traduce

| | |
|---|---|
| 🖥️ **Interfaz** | Las ~650 cadenas del sistema: hojas de personaje, criatura y nave, ajustes, generador de personajes, avisos. |
| 🧩 **Textos fijos** | Botones, diálogos y mensajes que el sistema escribe en inglés dentro de plantillas y código; se traducen al vuelo sin tocar el sistema. |
| 📚 **Compendios** | Condiciones, averías de mantenimiento, tablas y macros de **0e y 1e**, con Babele (los datos originales quedan intactos). |
| 📖 **Glosario** | Guardián, Cordura, Miedo, Cuerpo, Estrés, Determinación, Salvación de muerte… ver [`docs/GLOSARIO.md`](docs/GLOSARIO.md). |

## 🔧 Cómo está hecho

- `lang/es.json`: idioma del sistema (se fusiona con el de `mosh` cuando el idioma es español).
- `lang/literales.json` + `scripts/mr-mothership-es.js`: diccionario de textos fijos y patrones con datos (`Tu actor controlado no tiene…`), aplicado a la interfaz según se dibuja.
- `compendium/mosh.*.json`: traducciones para Babele.
- `tools/`: `extract.py` (saca los textos del sistema), `traducir.py` (los traduce con DeepSeek vía opencode y valida que no se rompa ningún marcador), `montar.py` (genera los ficheros del módulo).

> ℹ️ La condición **Bleeding** conserva su nombre original en el compendio porque el sistema la busca por ese nombre para sus cálculos; en pantalla se ve como **Sangrado**.

## 🐛 Erratas

No hay edición oficial en español de Mothership, así que los términos son una propuesta. Si ves un texto en inglés o una traducción mejorable, abre un [issue](https://github.com/ManuRomera/mr-mothership-es/issues) con una captura.

Más módulos y sistemas de Manu Romera: [github.com/ManuRomera](https://github.com/ManuRomera).

Obra no oficial; **Mothership** es marca de Tuesday Knight Games. Ver [`NOTICE.md`](NOTICE.md).
