/** MR- Mothership en español: compendios (Babele) + textos fijos del sistema que no pasan por i18n. */
const ID = "mr-mothership-es";
let literales = {};
let patrones = [];

// Babele: traduce los compendios del sistema sin tocar sus datos
Hooks.once("babele.init", babele => {
  babele.register({module: ID, lang: "es", dir: "compendium"});
});

async function cargar() {
  try {
    const r = await fetch(`modules/${ID}/lang/literales.json`);
    const j = await r.json();
    literales = j.literales ?? {};
    patrones = (j.patrones ?? []).map(p => ({re: new RegExp(p.en), es: p.es}));
  } catch (e) { console.warn(`${ID} | no se pudieron cargar los literales`, e); }
}

const esEspanol = () => game.system?.id === "mosh" && game.i18n.lang === "es";

function traducir(texto) {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (!limpio) return null;
  let es = literales[limpio];
  if (es === undefined) {
    for (const p of patrones) {
      const m = limpio.match(p.re);
      if (m) { es = p.es.replace(/\$(\d)/g, (_, n) => m[n] ?? ""); break; }
    }
  }
  if (es === undefined || es === limpio) return null;
  return texto.replace(limpio, es);
}

const ATTRS = ["placeholder", "title", "data-tooltip", "aria-label"];

function recorrer(raiz) {
  if (!raiz) return;
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    if (n.parentElement?.closest("script,style,textarea,[contenteditable]")) continue;
    const t = traducir(n.nodeValue);
    if (t !== null) n.nodeValue = t;
  }
  if (raiz.nodeType !== 1) return;
  for (const el of [raiz, ...raiz.querySelectorAll("[placeholder],[title],[data-tooltip],[aria-label]")]) {
    for (const a of ATTRS) {
      const v = el.getAttribute?.(a);
      const t = v && traducir(v);
      if (t) el.setAttribute(a, t);
    }
  }
}

Hooks.once("ready", async () => {
  if (!esEspanol()) return;
  await cargar();
  const ver = nodo => nodo.nodeType === 1 ? recorrer(nodo) : nodo.nodeType === 3 && nodo.parentElement && recorrer(nodo.parentElement);
  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === "characterData") { const t = traducir(m.target.nodeValue); if (t !== null) m.target.nodeValue = t; }
      else m.addedNodes.forEach(ver);
    }
  }).observe(document.body, {childList: true, subtree: true, characterData: true});
  recorrer(document.body);
});
