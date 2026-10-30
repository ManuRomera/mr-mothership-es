# Cambios

## 1.3.0 - 2026-10-30
- **Parches en el generador de personajes:** al pulsar el parche en el «Generador de personajes» del sistema sale el d100 de este módulo (con imagen, tarjeta en el chat sin botón) y, al guardar el personaje, el parche se cose solo a la ficha como objeto con su imagen. Se puede desactivar en Configuración del módulo («Parches del módulo en el generador de personajes»); entonces el generador usa la tabla de la clase como siempre.
- **Lupa:** al pasar el cursor por la miniatura de un parche en la ficha se ve la imagen grande.

## 1.2.0 - 2026-10-28
- **Parches (d100):** los 100 parches de la tabla de creación de personaje con su imagen. «Tirar parche» (Configuración → Parches) saca una tarjeta al chat con la imagen y el botón «Coser a mi personaje», que lo añade como objeto con su imagen. El Guardián puede crear la tabla nativa «Parches (d100)» en el mundo con un clic. También por API: `game.modules.get("mr-mothership-es").api.tirarParche()`.

## 1.1.0 - 2026-10-17
- Ajustes del sistema (nombres, ayudas y opciones), nombres de tipos de actor y objeto (Arma, Armadura, Personaje…) y títulos de las ventanas de nave y criatura.
- Mensajes de chat completos: «Tirada de Fuerza», «Has sacado menos que tu…», «Estrés aumenta de 3 a 4», «Infliges 10 puntos de daño», ¡ÉXITO!/¡FALLO!.
- Claves que el sistema usa pero no define (Reparación mayor/menor, Capitán, Crear tripulante, MÁX/ACTUAL…) ya no se ven como «Mosh.Algo».
- Párrafos de los diálogos de los macros traducidos enteros, no por fragmentos.
- El traductor de textos fijos admite patrones con partes variables.

## 1.0.0 - 2026-10-17
- Primera versión: interfaz completa (`lang/es.json`, ~650 cadenas), textos fijos de hojas, diálogos y chat, y los 9 compendios de MoSh 0.6.1 (condiciones, averías, macros y tablas de 0e y 1e) traducidos al español de España con Babele.
