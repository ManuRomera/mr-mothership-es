// Mejoras de mesa para el sistema MoSh: accesibilidad, modo oscuro (hojas, diálogos y tarjetas del chat) y ficha resumida.
// Son ajustes de cliente: cada persona elige los suyos en su navegador.
const ID = "mr-mothership-es";
const CAJAS = [
  ["oscuro", "Modo oscuro", "Hojas, diálogos y tarjetas de tirada del chat en negro (las ilustraciones conservan sus colores)."],
  ["contraste", "Alto contraste", "Texto y bordes más marcados."],
  ["legible", "Fuente de alta legibilidad", "Letra más espaciada y de formas claras en hojas y tarjetas."],
  ["movimiento", "Reducir movimiento", "Sin transiciones ni animaciones en las ventanas y tarjetas de Mothership."],
  ["ayuda", "Ayuda inmediata", "Los textos de ayuda aparecen al instante al pasar el ratón."],
];
const g = k => game.settings.get(ID, `a11y-${k}`);

function aplicar() {
  document.documentElement.style.setProperty("--mr-escala", String(g("escala") / 100));
  for (const [k] of CAJAS) document.body.classList.toggle(`mr-mosh-${k}`, g(k));
  const tip = game.tooltip?.constructor;
  if (tip) tip.TOOLTIP_ACTIVATION_MS = g("ayuda") ? 60 : 500;
}

async function panel() {
  const filas = CAJAS.map(([k, t, ayuda]) => `<label class="mr-a11y-fila"><input type="checkbox" name="${k}" ${g(k) ? "checked" : ""}><span><strong>${t}</strong><small>${ayuda}</small></span></label>`).join("");
  const datos = await foundry.applications.api.DialogV2.input({
    window: { title: "Accesibilidad", icon: "fa-solid fa-universal-access" }, classes: ["mr-a11y"], position: { width: 420 },
    content: `<label class="mr-a11y-fila"><span><strong>Tamaño del texto (%)</strong><small>Hojas y tarjetas de Mothership.</small></span>
      <input type="number" name="escala" min="85" max="160" step="5" value="${g("escala")}"></label>${filas}
      <p class="hint">También están en Configuración → Ajustes del módulo.</p>`,
    ok: { label: "Guardar", icon: "fa-solid fa-check" }, rejectClose: false,
  });
  if (!datos) return;
  for (const [k] of CAJAS) await game.settings.set(ID, `a11y-${k}`, !!datos[k]);
  await game.settings.set(ID, "a11y-escala", Math.min(160, Math.max(85, Number(datos.escala) || 100)));
}

// la respuesta al trauma es un cuadro de alto fijo: la letra se reduce hasta que el texto cabe entero
function encajar(t) {
  t.style.fontSize = ""; t.style.lineHeight = "1.2";
  let s = parseFloat(getComputedStyle(t).fontSize);
  while (t.scrollHeight > t.clientHeight + 1 && s > 8) t.style.fontSize = `${(s -= 0.5)}px`;
}

// ficha resumida: solo cabecera, características, salud y salvaciones; se recuerda por actor en este navegador
const clave = app => `${ID}.resumida.${app.actor?.id}`;
const leer = app => { try { return localStorage.getItem(clave(app)) === "1"; } catch { return false; } };
function resumir(app, si) {
  try { si ? localStorage.setItem(clave(app), "1") : localStorage.removeItem(clave(app)); } catch { }
  app.element?.[0]?.classList.toggle("mr-resumida", si);
  app.setPosition({ height: si ? "auto" : 820 });
}

Hooks.once("init", () => {
  const reg = (k, datos) => game.settings.register(ID, `a11y-${k}`, { scope: "client", config: true, onChange: aplicar, ...datos });
  reg("escala", { name: "Accesibilidad: tamaño del texto (%)", hint: "Escala el texto de las hojas, diálogos y tarjetas de Mothership.", type: Number, default: 100, range: { min: 85, max: 160, step: 5 } });
  for (const [k, t, ayuda] of CAJAS) reg(k, { name: k === "oscuro" ? t : `Accesibilidad: ${t.toLowerCase()}`, hint: ayuda, type: Boolean, default: k === "ayuda" });
});
Hooks.once("ready", () => { if (game.system?.id === "mosh") aplicar(); });

Hooks.on("getActorSheetHeaderButtons", (app, botones) => {
  if (game.system?.id !== "mosh") return;
  botones.unshift({ label: "Accesibilidad", class: "mr-a11y-boton", icon: "fa-solid fa-universal-access", onclick: panel });
  if (app.actor?.type === "character") botones.unshift({ label: "Resumida", class: "mr-resumir", icon: "fa-solid fa-compress", onclick: () => resumir(app, !leer(app)) });
});

Hooks.on("renderActorSheet", (app, html) => {
  if (game.system?.id !== "mosh") return;
  const raiz = html[0] ?? html;
  if (app.actor?.type === "character") (app.element?.[0] ?? raiz).classList.toggle("mr-resumida", leer(app));
  const t = raiz.querySelector('textarea[name="system.other.stressdesc.value"]');
  if (t) { requestAnimationFrame(() => encajar(t)); t.addEventListener("input", () => encajar(t)); }
});
