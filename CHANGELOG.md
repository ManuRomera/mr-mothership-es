# Cambios

## 1.7.0 - 2026-10-30
- **Automatismos de combate, cada uno con su interruptor** en Configuración → Ajustes del módulo («Combate: …»):
  - **Aplicar daño** (de la 1.6.0), ahora con botones «Objetivos» y «Selección» integrados dentro de la propia tarjeta del sistema.
  - **Orden estricto por Velocidad:** la iniciativa de los personajes es una tirada de Velocidad con la tarjeta del sistema; quien la supera actúa antes que los enemigos y quien falla, después. Botón «Velocidad» en el registro de combate.
  - **Sorpresa:** botón en el registro de combate; salvación de Miedo para los personajes y quien falla queda «Conmocionado» hasta la ronda siguiente.
  - **Sangrado por ronda:** al empezar su turno, quien sangra pierde tanta salud como su Sangrado, sin armadura ni reducción de daño, con heridas si llega a 0.
  - **Disparar desde cobertura:** quien dispara a distancia sale de la cobertura hasta su próximo turno.
  - **Pánico automático:** tras un fallo crítico se tira el pánico sin pulsar el enlace.
  - **Respuestas al trauma:** en la tarjeta de pánico (Marine, Pastor) o de Cordura fallida (Científico) aparece la respuesta al trauma y un botón para aplicarla a los aliados cercanos; aviso cuando hay un Androide cerca en las salvaciones de Miedo. Distancia de «cercano» configurable.
  - **Estados en el token:** herido, sangrando, armadura destruida, muriendo y conmocionado, con los iconos del sistema.
- Las tarjetas nuevas (daño, sangrado, cobertura, heridas máximas) usan el mismo diseño que las del sistema. La descripción del arma en la tarjeta de daño se pliega a tres líneas (pulsa para desplegarla).
- **Habilidades con descripción de una sola frase**, y el diálogo «¿Añadir una habilidad?» recorta a tres líneas las descripciones largas de personajes ya creados.
- **Corrección de un fallo del sistema:** al gastar munición, el arma quedaba dañada en memoria (sin datos) hasta recargar la página.

## 1.6.0 - 2026-10-30
- **Aplicar daño desde el chat.** Las tarjetas de daño de un arma traen dos botones: «Aplicar a objetivos» (tokens marcados con T) y «A seleccionados». Se aplican las reglas de la Guía de supervivencia (cap. 28-29):
  - primero la **reducción de daño** (de la armadura y de la cobertura pesada);
  - la **cobertura** (solo contra ataques a distancia) y la **armadura** ignoran el daño menor que sus PA; si el daño los iguala o supera, se destruyen y pasa el resto. Las armas **antiarmadura** ignoran y destruyen la armadura;
  - la armadura destruida se desequipa y pasa a llamarse «… (destruida)»; la cobertura vuelve a «ninguna»;
  - al llegar la salud a 0 se sufre una **herida** y se tira en la tabla del tipo de herida del arma (con su [+]/[−]); un golpe enorme puede encadenar varias heridas;
  - con las heridas al máximo, el Guardián tira **en secreto** la salvación de muerte (a ciegas); las criaturas quedan marcadas como muertas.
  - Un resumen en el chat explica paso a paso qué absorbió el daño. Si un jugador aplica daño a un token que no es suyo, lo ejecuta el Guardián conectado.
- **Corrección:** con los nombres de las tablas traducidos, el sistema dejaba de sumar la herida al tirar en una tabla de heridas y de aplicar el resultado 19 de la tabla de pánico (compara el nombre en inglés). Ahora esas tablas conservan el nombre original por dentro y se ven en español.

## 1.5.1 - 2026-10-30
- **Árbol de habilidades de Mothership 1e en el generador.** Las habilidades expertas y maestras no tenían requisitos previos (ni en el compendio original ni en los mundos antiguos), así que el generador ofrecía cualquier experta/maestra, o ninguna en las elecciones sueltas. Ahora cada experta y maestra lleva sus requisitos según el esquema de la hoja de personaje oficial (p. ej. Cirugía ← Patología o Medicina de campo ← Zoología o Botánica; Hiperespacio ← Pilotar, Física o Misticismo). En el diálogo «maestra + experta + entrenada» cada desplegable solo ofrece el camino válido de lo elegido arriba; en las elecciones sueltas solo salen expertas cuyo requisito ya tienes.
- Los desplegables de ese diálogo no filtraban nunca (Foundry elimina el `onchange` del HTML del diálogo): ahora se escucha el cambio desde el módulo.
- **Clases oficiales alineadas con la hoja:** Marine y Androide (1 experta o 2 entrenadas, sin regalar el requisito), Científico (maestra con requisitos + 1 entrenada + 1 experta; le faltaba la experta) y Tripulante (1 entrenada + 1 experta).
- Las habilidades propias de clase (Apaños técnicos, Saber corporativo, Psiónica, Supervivencia agreste…) llevan requisitos razonables añadidos por el autor del módulo.

## 1.5.0 - 2026-10-30
- **Descripciones completas** para las 16 clases (ambientación, cómo interpretarlas con frases de ejemplo y ganchos de trasfondo), 39 armas y 42 armaduras y prendas (en tono de catálogo, conservando debajo la regla original), 49 habilidades (qué abarcan y cuándo se usan), 184 objetos y equipo, y las 100 averías de mantenimiento (qué se ve, qué lo causa y un gancho de escena para el Guardián).
- **Generador de personajes con nombre y biografía:** nuevo selector de sexo (aleatorio, hombre, mujer, no binario) y botón «Nombre y biografía». Al elegir clase se propone un nombre (con mote a veces) y una biografía de varios párrafos a medida de la clase, el equipo, las habilidades, el parche y la baratija; se puede editar y se guarda en la ficha. Reservas amplias por clase y sin repetir frases entre personajes seguidos.
- **Iconos nuevos** al estilo Mothership para el arco, los puños americanos, el lanzacohetes LAT-90 y siete armaduras (atuendo de la tripulación, ropa de trabajo pesada, trajes de batalla, traje de riesgo biológico, traje de vacío y uniforme); también para varios objetos que llevaban un icono genérico.
- «Pastor» se interpreta como guía espiritual, no como ganadero. Nombres con tildes (Revólver, Lingüística, Traje de vacío…).

## 1.4.0 - 2026-10-30
- **Clases y equipo en español, listos para el generador de personajes.** Nuevos compendios del módulo: 16 clases (Marine, Androide, Científico, Tripulante, Colono, Ejecutivo, Pastor, Buscavidas, Criminal, Psíquico, Explorador, Jubilado, Escoria, Esclavo asalariado, Atavismo y Psiónico), 49 habilidades, 39 armas, 42 armaduras, 202 objetos, los 100 parches como objetos, 18 tablas de equipo inicial/baratijas/parches y las reglas rápidas. El «Generador de personajes» del sistema ya encuentra las clases (antes decía que faltaba la clase) y rellena habilidades, equipo, parche y baratija.
- **Equipo inicial con varios objetos y cantidades** («x2»): el generador original solo entendía un objeto por resultado; ahora se añaden todos al guardar.
- **Iconos al estilo Mothership:** armas y habilidades reutilizan los iconos del sistema; los objetos, armaduras y clases que no tenían icono llevan pictogramas nuevos sobre el panel oscuro hexagonal con borde blanco (generados con IA y montados por código).
- Nombres de habilidad con tildes y botones del bono de clase en español (Fuerza, Velocidad…).
- Si tienes activo el módulo «Básicos de Mosh», desactívalo: este lo sustituye.

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
