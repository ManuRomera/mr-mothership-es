// Automatismos de combate según la Guía de supervivencia (cap. 20, 26-29 y 32). Cada bloque se activa en Ajustes del módulo.
// Las tarjetas usan el mismo marcado que las del sistema (.mosh .rollcontainer) para verse igual en el chat.
const ID = "mr-mothership-es";
const SIS = "systems/mosh/images/icons/ui";
const COBERTURA = { insignificant: { pa: 5, rd: 0, nombre: "insignificante" }, light: { pa: 10, rd: 0, nombre: "ligera" }, heavy: { pa: 20, rd: 5, nombre: "pesada" } };
const HERIDAS = [ // [patrón en system.woundEffect, ajuste de la tabla del sistema, nombre]
  [/bleeding|sangrado/i, "table1eWoundBleeding", "Sangrado"], [/blunt|contundente/i, "table1eWoundBluntForce", "Fuerza contundente"], [/gunshot|disparo/i, "table1eWoundGunshot", "Disparo"],
  [/fire|fuego|explosiv/i, "table1eWoundFireExplosives", "Fuego y explosivos"], [/gore|desgarr|masiv/i, "table1eWoundGoreMassive", "Desgarro y masivo"]];
const MUERTE = "NsRHfRuuNGPfkYVf"; // macro «Salvación de muerte» que enlazan las lesiones fatales
const PANICO = "macros_hotbar_1e.IgWvaabVqzKDzLL4"; // enlace «Haz una tirada de pánico» que el sistema pone en los fallos críticos
const AJUSTES = {
  cbDanio: ["Combate: aplicar daño", "Botones «Objetivos» y «Selección» en las tarjetas de daño: reducción de daño, cobertura, armadura, heridas con su tabla y sus efectos (sangrado, estrés, fuego, lesiones letales) y salvación de muerte secreta."],
  cbVelocidad: ["Combate: orden estricto por Velocidad", "La iniciativa es una tirada de Velocidad: quien la supera actúa antes que los enemigos y quien falla, después (regla opcional de la Guía)."],
  cbSorpresa: ["Combate: sorpresa", "Botón «Sorpresa» en el registro de combate: salvación de Miedo para los personajes; quien falla queda conmocionado y no actúa esta ronda."],
  cbSangrado: ["Combate: sangrado y fuego por ronda", "Al empezar su turno, quien sangra pierde tanta salud como su Sangrado y quien arde, el daño de su herida (ignoran armadura y reducción de daño)."],
  cbCobertura: ["Combate: disparar desde cobertura", "Quien dispara desde cobertura queda fuera de ella hasta su próximo turno."],
  cbPanico: ["Combate: pánico automático", "Tras un fallo crítico se abre la tirada de pánico de ese personaje sin tener que pulsar el enlace."],
  cbTrauma: ["Combate: respuestas al trauma", "En las tarjetas de pánico y de salvación se muestra la respuesta al trauma de la clase con un botón para aplicarla a los aliados cercanos (Marine, Científico, Pastor) o un aviso (Androide)."],
  cbEstados: ["Combate: estados en el token", "Iconos automáticos de herido, sangrando, armadura destruida y muriendo."],
};
const on = k => game.settings.get(ID, k);
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const esperar = ms => new Promise(r => setTimeout(r, ms));
const soyGM = () => game.user === game.users.activeGM;

/** Tarjeta con el aspecto de las del sistema. */
const tarjeta = (titulo, img, cuerpo) => `<div class="mosh mr-tarjeta"><div class="rollcontainer"><div class="flexrow" style="margin-bottom:5px">
  <div class="rollweaponh1">${titulo}</div><div style="text-align:right"><img class="roll-image" src="${img}"></div></div>
  <div class="description" style="margin-bottom:12px"><div class="body">${cuerpo}</div></div></div></div>`;
const decir = (actor, titulo, img, cuerpo, extra = {}) => ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: tarjeta(titulo, img, cuerpo), ...extra });

// ---------------------------------------------------------------- tiradas de característica / salvación con la tarjeta del sistema
const ETIQ = { speed: "Velocidad", fear: "Miedo", sanity: "Cordura", body: "Cuerpo", strength: "Fuerza", intellect: "Intelecto", combat: "Combate" };
async function chequeo(actor, attr, titulo, nota = "") {
  const st = actor.system.stats?.[attr]; if (!st) return null;
  const objetivo = Number(st.value || 0) + Number(st.mod || 0);
  const tirada = await new Roll("1d100").evaluate();
  const r = actor.parseRollResult("1d100", tirada, true, true, objetivo, "<", null);
  const content = await foundry.applications.handlebars.renderTemplate("systems/mosh/templates/chat/rollCheck.html", {
    actor, parsedRollResult: r, skillValue: 0, msgHeader: titulo, msgImgPath: `${SIS}/attributes/${attr}.png`,
    outcomeVerb: r.success ? "rolled" : "did not roll", comparisonText: "less than", attribute: ETIQ[attr] ?? attr,
    flavorText: typeof nota === "function" ? nota(r) : nota, critFail: !r.success && r.critical, firstEdition: true });
  await tirada.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), content });
  if (!r.success && game.settings.get("mosh", "autoStress")) await actor.modifyActor("system.other.stress.value", 1, null, false);
  return r;
}

// ---------------------------------------------------------------- daño (cap. 28-29)
function herida(texto = "") {
  const t = HERIDAS.find(([re]) => re.test(texto));
  if (!t) return null;
  const dado = /\[\+\]/.test(texto) ? "1d10 [+]" : /\[[-–]\]/.test(texto) ? "1d10 [-]" : "1d10";
  return { ajuste: t[1], dado, nombre: t[2] + (dado === "1d10" ? "" : ` ${dado.slice(5)}`) };
}
/** Tipo de herida del arma; si admite varios («Sangrado o Desgarro») o no dice ninguno, lo elige quien aplica el daño. */
async function elegirHerida(efecto = "") {
  let ops = String(efecto).split(/\s+(?:or|o|\+)\s+/i).map(herida).filter(Boolean);
  if (ops.length === 1) return ops[0];
  if (!ops.length) ops = HERIDAS.map(([, , n]) => herida(n));
  const i = await foundry.applications.api.DialogV2.wait({
    window: { title: "Tipo de herida" }, content: "<p>¿En qué tabla de heridas se tira?</p>", rejectClose: false,
    buttons: ops.map((o, n) => ({ action: String(n), label: o.nombre, default: !n }))
  });
  return ops[Number(i) || 0];
}
/** Aplica sola lo que dice la herida que ha salido: sangrado, estrés, salud por ronda, salvación de muerte (inmediata o en 1d10 rondas). */
async function efectosHerida(actor, msg) {
  const html = msg?.content ?? "", texto = html.replace(/<[^>]+>/g, " ");
  let cae = false;
  const alMaximo = Number(actor.system.hits?.max) > 0 && Number(actor.system.hits.value) >= Number(actor.system.hits.max);
  if (msg?.isOwner) await msg.setFlag(ID, "aplicado", true); // sus enlaces se muestran como hechos para no aplicarlos dos veces
  for (const [, pack, id] of html.matchAll(/Compendium\.mosh\.(macros_(?:triggered|hotbar)_1e)\.(?:Macro\.)?([A-Za-z0-9]{16})/g)) {
    // con las heridas al máximo el enlace de muerte es el del propio sistema: la tarjeta de salvación ya la publica herirSalud
    if (id === MUERTE) { if (!alMaximo) { await salvacionMuerte(actor, "Lesión fatal."); cae = true; } continue; }
    const cmd = (await game.packs.get(`mosh.${pack}`)?.getDocument(id))?.command ?? "";
    let r;
    if ((r = /initModifyItem\('([^']+)',\s*(-?\d+)\)/.exec(cmd))) await actor.modifyItem(r[1], Number(r[2]));
    else if ((r = /initModifyActor\('([^']+)',\s*([^,]+),\s*([^,]+),/.exec(cmd))) {
      const campo = r[1], val = r[2].trim() === "null" ? null : Number(r[2]), tirada = r[3].trim() === "null" ? null : r[3].replace(/['"\s]/g, "");
      if (campo === "system.health.value" && tirada) { await arder(actor, tirada.replace(/^-/, "")); continue; } // «Xd10 de daño por ronda»
      // «Los que estén cerca ganan 1 de Estrés»: el estrés es para los demás, no para quien sangra
      const quien = campo === "system.other.stress.value" && /cerca|nearby/i.test(texto) ? cercanos(actor) : [actor];
      for (const a of quien) await ejecutar("modificar", a, { campo, val, tirada });
    }
  }
  if (!alMaximo && /Salvaci[oó]n de Muerte en|Death Save in/i.test(texto)) {
    const n = (await new Roll("1d10").evaluate()).total;
    await actor.setFlag(ID, "muerteEn", { n, ronda: game.combat?.started ? game.combat.round + n : null });
    await decir(actor, "Lesión letal", `${SIS}/conditions/doomed.png`, `<p><strong>${esc(actor.name)}</strong> hará la salvación de muerte dentro de <strong>${n} ${n === 1 ? "ronda" : "rondas"}</strong> si nadie trata la herida.</p>`,
      { flags: { [ID]: { quitar: { uuid: actor.uuid, flag: "muerteEn", texto: "Herida tratada" } } } });
  }
  return cae;
}
async function arder(actor, formula) {
  await actor.setFlag(ID, "llamas", formula);
  await decir(actor, "En llamas", `${SIS}/conditions/extreme_heat.png`, `<p><strong>${esc(actor.name)}</strong> arde: pierde <strong>${formula}</strong> de salud al empezar cada uno de sus turnos (ignora armadura) hasta que alguien apague el fuego.</p>`,
    { flags: { [ID]: { quitar: { uuid: actor.uuid, flag: "llamas", texto: "Fuego apagado" } } } });
}
/** Las criaturas mueren al llegar a sus heridas máximas; un personaje solo queda a punto de morir: la tirada la pide el Guardián (o el jugador) con los botones de la tarjeta. */
async function salvacionMuerte(actor, motivo = "") {
  await actor.unsetFlag(ID, "muerteEn");
  if (actor.type !== "character") return actor.toggleStatusEffect("dead", { active: true, overlay: true });
  await decir(actor, "Salvación de muerte", `${SIS}/conditions/doomed.png`,
    `<p><strong>${esc(actor.name)}</strong> cae al suelo. ${esc(motivo)}</p><p>Toca una <strong>salvación de muerte</strong>. El Guardián la tira en secreto y la revela cuando alguien dedique un turno a comprobar sus constantes vitales; el jugador también puede tirarla.</p>`,
    { flags: { [ID]: { muerte: actor.uuid } } });
}
async function tirarMuerte(actor, secreta) {
  if (!actor) return;
  const tabla = game.settings.get("mosh", "table1eDeath");
  if (secreta) return (await buscarTabla(tabla))?.draw({ rollMode: CONST.DICE_ROLL_MODES.BLIND });
  return actor.rollTable(tabla, "", "low", true, false, null, null);
}
async function buscarTabla(id) {
  const t = id && (await fromUuid(id).catch(() => null));
  if (t) return t;
  for (const p of game.packs.filter(p => p.documentName === "RollTable")) if (p.index.has(id)) return p.getDocument(id);
  return game.tables.get(id) ?? null;
}

/** Baja la salud con heridas encadenadas (cap. 28.2); añade líneas al resumen y devuelve lo que hay que tirar después. */
async function herirSalud(actor, resto, efecto, pasos) {
  const maxSalud = Number(actor.system.health.max), maximo = Number(actor.system.hits.max);
  let salud = Number(actor.system.health.value), heridas = Number(actor.system.hits.value), nuevas = 0;
  const antes = salud;
  // con las heridas al máximo ya está fuera de combate: el daño no cambia nada, solo queda la salvación de muerte
  if (maximo > 0 && heridas >= maximo) {
    pasos.push(`Ya tiene sus heridas máximas (${heridas}/${maximo}): está caído a la espera de la salvación de muerte`);
    if (salud) await actor.update({ "system.health.value": 0 });
    return null;
  }
  // salud a 0 → 1 herida y la salud vuelve al máximo; el daño sobrante sigue restando (puede encadenar heridas)
  while (resto > 0 && heridas < maximo) {
    if (resto < salud) { salud -= resto; resto = 0; break; }
    resto -= salud; heridas++; nuevas++;
    salud = heridas < maximo ? maxSalud : 0;
  }
  const conTabla = actor.type === "character" && game.settings.get("mosh", "firstEdition");
  pasos.push(`Salud ${antes} → <strong>${salud}</strong>${nuevas ? ` · <strong>${nuevas === 1 ? "1 herida" : `${nuevas} heridas`}</strong> (${heridas}/${maximo})` : ""}`);
  if (nuevas && heridas < maximo) pasos.push(`La salud se reinicia: le ${maximo - heridas === 1 ? "queda 1 herida" : `quedan ${maximo - heridas} heridas`} antes de caer`);
  await actor.update({ "system.health.value": salud, ...(conTabla ? {} : { "system.hits.value": heridas }) });
  return async () => {
    // la tabla del sistema suma ella misma la herida (sin esperar a guardarla): una tirada cada vez, se espera al cambio
    // y se aplican los efectos del resultado (sangrado, estrés, fuego, salvación de muerte)
    let cae = false;
    if (conTabla) for (let i = 0; i < nuevas && !cae; i++) {
      const h = await elegirHerida(efecto), prev = Number(actor.system.hits.value);
      await actor.rollTable(game.settings.get("mosh", h.ajuste), h.dado, "low", true, false, null, null);
      for (let t = 0; t < 20 && Number(actor.system.hits.value) === prev; t++) await esperar(100);
      cae = await efectosHerida(actor, game.messages.contents.findLast(m => m.speaker?.actor === actor.id && /Wound|Herida/.test(m.content)));
    }
    if (!nuevas || heridas < maximo || cae) return;
    await salvacionMuerte(actor, `Ha sufrido sus heridas máximas (${heridas}/${maximo}).`);
  };
}

async function aplicar(actor, danio, { aa = false, distancia = true, arma = "", efecto = "" } = {}) {
  const a = actor.system.stats?.armor ?? {}, pasos = [];
  let resto = Math.max(0, Math.floor(Number(danio) || 0));
  const cob = distancia ? COBERTURA[a.cover] : null;
  const rd = Number(a.damageReduction || 0) + (cob?.rd ?? 0);
  if (rd && resto) { pasos.push(`Reducción de daño ${rd}: ${resto} → ${Math.max(0, resto - rd)}`); resto = Math.max(0, resto - rd); }
  const cambios = {};
  if (cob && resto) {
    if (resto < cob.pa) { pasos.push(`La cobertura ${cob.nombre} (PA ${cob.pa}) lo absorbe todo`); resto = 0; }
    else { pasos.push(`La cobertura ${cob.nombre} (PA ${cob.pa}) queda destruida`); resto -= cob.pa; cambios["system.stats.armor.cover"] = "none"; }
  }
  const pa = Number(a.total ?? (Number(a.mod || 0) + Number(a.value || 0)));
  let romper = false;
  if (pa > 0 && resto) {
    if (aa) { pasos.push(`Antiarmadura: ignora y destruye la armadura (PA ${pa})`); romper = true; }
    else if (resto < pa) { pasos.push(`La armadura (PA ${pa}) lo absorbe todo`); resto = 0; }
    else { pasos.push(`La armadura (PA ${pa}) queda destruida`); resto -= pa; romper = true; }
  }
  if (romper) {
    if (Number(a.value || 0)) cambios["system.stats.armor.value"] = 0;
    const rotas = actor.items.filter(i => i.type === "armor" && i.system.equipped)
      .map(i => ({ _id: i.id, "system.equipped": false, name: /\(destruida\)$/.test(i.name) ? i.name : `${i.name} (destruida)` }));
    if (rotas.length) await actor.updateEmbeddedDocuments("Item", rotas);
  }
  if (Object.keys(cambios).length) await actor.update(cambios);
  const despues = resto ? await herirSalud(actor, resto, efecto, pasos) : (pasos.push("<strong>Sin daño</strong>"), null);
  await decir(actor, `${esc(actor.name)}: ${danio} de daño`, `${SIS}/attributes/${resto ? "health" : "armor"}.png`,
    `${arma ? `<p><em>${esc(arma)}</em></p>` : ""}<ul class="mr-pasos">${pasos.map(p => `<li>${p}</li>`).join("")}</ul>`);
  await despues?.();
}

// ---------------------------------------------------------------- acciones que pueden necesitar al Guardián (tokens ajenos)
const ACCIONES = {
  danio: (actor, d) => aplicar(actor, d.danio, d),
  estres: (actor, n) => actor.modifyActor("system.other.stress.value", n, null, true),
  modificar: (actor, d) => actor.modifyActor(d.campo, d.val, d.tirada, true),
  quitar: (actor, flag) => actor.unsetFlag(ID, flag),
  miedo: (actor, nota) => chequeo(actor, "fear", "Salvación de Miedo", nota),
};
async function ejecutar(accion, actor, datos) {
  if (actor.isOwner) return ACCIONES[accion](actor, datos);
  if (game.users.activeGM) game.socket.emit(`module.${ID}`, { accion, uuid: actor.uuid, datos });
  else ui.notifications.warn(`No hay Guardián conectado para aplicarlo a ${actor.name}.`);
}

// ---------------------------------------------------------------- aliados cercanos (para las respuestas al trauma)
function cercanos(actor) {
  const yo = actor.getActiveTokens()[0], max = on("cbCercano");
  const pjs = canvas.tokens?.placeables.filter(t => t.actor?.type === "character" && t.actor !== actor && !t.actor.statuses.has("dead")) ?? [];
  if (yo && pjs.length) return pjs.filter(t => canvas.grid.measurePath([yo.center, t.center]).distance <= max).map(t => t.actor);
  return game.combat?.combatants.filter(c => c.actor?.type === "character" && c.actor !== actor).map(c => c.actor) ?? [];
}
const TRAUMA = [ // [clase, en qué tarjetas, botón, acción]
  [/^marine/i, "panico", "Aliados cercanos: salvación de Miedo", (a) => cercanos(a).forEach(x => ejecutar("miedo", x, `Respuesta al trauma de ${a.name} (Marine).`))],
  [/^(cient[ií]fic|scientist)/i, "cordura", "Aliados cercanos: +1 de Estrés", (a) => cercanos(a).forEach(x => ejecutar("estres", x, 1))],
  [/^pastor/i, "panico", "Aliados cercanos: −1 de Estrés", (a) => cercanos(a).forEach(x => ejecutar("estres", x, -1))],
];

// ---------------------------------------------------------------- estados en el token
const ESTADOS = [
  { id: "mr-herido", name: "Herido", img: `${SIS}/attributes/health.png` },
  { id: "mr-sangrando", name: "Sangrando", img: `${SIS}/conditions/bleeding.png` },
  { id: "mr-armadura-rota", name: "Armadura destruida", img: `${SIS}/attributes/armor.png` },
  { id: "mr-muriendo", name: "Muriendo", img: `${SIS}/conditions/doomed.png` },
  { id: "mr-conmocionado", name: "Conmocionado", img: `${SIS}/conditions/dizzy.png` },
  { id: "mr-en-llamas", name: "En llamas", img: `${SIS}/conditions/extreme_heat.png` },
];
const sangrado = actor => Number(actor.items.find(i => i.type === "condition" && /^(bleeding|sangrado)$/i.test(i.name))?.system.severity || 0);
async function sincronizar(actor) {
  if (!actor || !on("cbEstados") || !soyGM() || !["character", "creature"].includes(actor.type)) return;
  const w = Number(actor.system.hits?.value || 0), m = Number(actor.system.hits?.max || 0);
  const quiero = {
    "mr-herido": w > 0 && w < m, "mr-sangrando": sangrado(actor) > 0, "mr-muriendo": actor.type === "character" && ((m > 0 && w >= m) || !!actor.getFlag(ID, "muerteEn")),
    "mr-en-llamas": !!actor.getFlag(ID, "llamas"),
    "mr-armadura-rota": actor.items.some(i => i.type === "armor" && /\(destruida\)$/.test(i.name)) && !actor.items.some(i => i.type === "armor" && i.system.equipped),
  };
  for (const [id, v] of Object.entries(quiero)) if (actor.statuses.has(id) !== v) await actor.toggleStatusEffect(id, { active: v });
}

// ---------------------------------------------------------------- registro
Hooks.once("init", () => {
  for (const [k, [name, hint]] of Object.entries(AJUSTES)) game.settings.register(ID, k, { name, hint, scope: "world", config: true, type: Boolean, default: true, requiresReload: k === "cbVelocidad" });
  game.settings.register(ID, "cbCercano", { name: "Combate: distancia de «aliados cercanos»", hint: "En unidades de la escena (metros). Si no hay escena, cuentan los personajes del combate.", scope: "world", config: true, type: Number, default: 10 });
  CONFIG.statusEffects.push(...ESTADOS);
});

Hooks.once("ready", () => {
  if (game.system?.id !== "mosh") return;
  game.socket.on(`module.${ID}`, async m => {
    if (!ACCIONES[m?.accion] || !soyGM()) return;
    const actor = await fromUuid(m.uuid);
    if (actor) await ACCIONES[m.accion](actor, m.datos);
  });
  const mod = game.modules.get(ID);
  mod.api = Object.assign(mod.api ?? {}, { aplicarDanio: aplicar, chequeo });

  // fallo del sistema: al gastar munición pasa el propio documento del arma a updateEmbeddedDocuments, que falla a medias
  // y deja el objeto sin «system» en memoria (el arma deja de verse bien hasta recargar). Se convierte en datos planos.
  const ued = CONFIG.Actor.documentClass.prototype.updateEmbeddedDocuments;
  CONFIG.Actor.documentClass.prototype.updateEmbeddedDocuments = function (tipo, cambios = [], opciones) {
    const planos = cambios.map(c => c instanceof foundry.abstract.Document ? { _id: c.id, system: foundry.utils.deepClone(c.system) } : c);
    return ued.call(this, tipo, planos, opciones);
  };

  // orden estricto: la iniciativa de los personajes es una tirada de Velocidad (éxito 2, enemigos 1, fallo 0; desempate por Velocidad)
  if (on("cbVelocidad")) {
    Combat.prototype.rollInitiative = async function (ids) {
      const cambios = [];
      for (const id of (typeof ids === "string" ? [ids] : ids)) {
        const c = this.combatants.get(id), a = c?.actor;
        if (!a) continue;
        if (a.type !== "character") { cambios.push({ _id: id, initiative: 1 }); continue; }
        const r = await chequeo(a, "speed", "Orden de turno", x => x.success ? "Actúa <strong>antes</strong> que los enemigos." : "Actúa <strong>después</strong> de los enemigos.");
        cambios.push({ _id: id, initiative: (r?.success ? 2 : 0) + Number(a.system.stats.speed.value || 0) / 1000 });
      }
      if (cambios.length) await this.updateEmbeddedDocuments("Combatant", cambios);
      return this;
    };
  }
});

// botones del registro de combate (Guardián)
Hooks.on("renderCombatTracker", (app, html) => {
  const raiz = html instanceof HTMLElement ? html : html[0];
  if (!game.user.isGM || !game.combat || raiz.querySelector(".mr-combate")) return;
  const b = [];
  if (on("cbVelocidad")) b.push(`<button type="button" data-mr="velocidad" data-tooltip="Tirada de Velocidad: quien la supera actúa antes que los enemigos"><img src="${SIS}/attributes/speed.png" alt=""> Velocidad</button>`);
  if (on("cbSorpresa")) b.push(`<button type="button" data-mr="sorpresa" data-tooltip="Salvación de Miedo: quien falla no reacciona esta ronda"><img src="${SIS}/attributes/fear.png" alt=""> Sorpresa</button>`);
  if (!b.length) return;
  const barra = document.createElement("div");
  barra.className = "mr-combate"; barra.innerHTML = b.join("");
  barra.addEventListener("click", async ev => {
    const a = ev.target.closest("button")?.dataset.mr, combate = game.combat; if (!a || !combate) return;
    if (a === "velocidad") return combate.rollInitiative(combate.combatants.map(c => c.id));
    for (const c of combate.combatants.filter(c => c.actor?.type === "character")) {
      const r = await chequeo(c.actor, "fear", "Sorpresa", x => x.success ? "Reacciona a tiempo." : "Queda <strong>conmocionado</strong>: no puede reaccionar hasta la siguiente ronda.");
      if (r && !r.success) { await c.actor.toggleStatusEffect("mr-conmocionado", { active: true }); }
    }
  });
  (raiz.querySelector(".combat-tracker-header") ?? raiz).prepend(barra);
});

// cambios de turno y ronda (los hace solo el Guardián)
Hooks.on("updateCombat", async (combate, cambio) => {
  if (!soyGM() || !("turn" in cambio || "round" in cambio)) return;
  if ("round" in cambio) for (const c of combate.combatants) {
    if (c.actor?.statuses.has("mr-conmocionado")) await c.actor.toggleStatusEffect("mr-conmocionado", { active: false });
    const m = c.actor?.getFlag(ID, "muerteEn"); // lesión letal sin tratar: llega la salvación de muerte
    if (m && (m.ronda ??= combate.round - 1 + m.n) <= combate.round) await salvacionMuerte(c.actor, "Se agotó la cuenta atrás de su lesión letal sin que nadie la tratase.");
  }
  const actor = combate.combatant?.actor; if (!actor) return;
  const previa = actor.getFlag(ID, "cobertura");
  if (previa) { await actor.update({ "system.stats.armor.cover": previa }); await actor.unsetFlag(ID, "cobertura"); }
  if (!on("cbSangrado") || combate.combatant.getFlag(ID, "sangro") === combate.round) return;
  // daño que no para (ignora armadura y reducción): sangrado y fuego de las heridas
  const s = sangrado(actor), llamas = actor.getFlag(ID, "llamas");
  if (!s && !llamas) return;
  await combate.combatant.setFlag(ID, "sangro", combate.round);
  const total = s + (llamas ? (await new Roll(llamas).evaluate()).total : 0);
  const pasos = [[s && `Sangrado ${s}`, llamas && `En llamas ${llamas}`].filter(Boolean).join(" + ") + `: <strong>${total}</strong> de daño (ignora armadura y reducción de daño)`];
  const despues = await herirSalud(actor, total, llamas ? "Fire & Explosives" : "Bleeding", pasos);
  await decir(actor, llamas ? "Fuego" : "Sangrado", `${SIS}/conditions/${llamas ? "extreme_heat" : "bleeding"}.png`, `<ul class="mr-pasos">${pasos.map(p => `<li>${p}</li>`).join("")}</ul>`);
  await despues?.();
});

// mensajes nuevos del propio usuario: pánico tras crítico y salir de cobertura al disparar
Hooks.on("createChatMessage", async msg => {
  if (game.system?.id !== "mosh" || msg.author?.id !== game.user.id) return;
  const c = msg.content ?? "";
  const actor = ChatMessage.getSpeakerActor(msg.speaker);
  if (!actor) return;
  if (on("cbPanico") && c.includes(PANICO) && !/>\s*Panic Check\s*</.test(c)) await actor.rollTable("panicCheck", "", null, false, false, null, null);
  const item = /data-item-id="([^"]+)"/.exec(c)?.[1];
  const arma = item && actor.items.get(item);
  if (on("cbCobertura") && arma?.type === "weapon" && !/adyacente|adjacent|cuerpo|melee/i.test(String(arma.system.ranges?.value ?? ""))) {
    const cob = actor.system.stats?.armor?.cover;
    if (cob && cob !== "none" && !actor.getFlag(ID, "cobertura")) {
      await actor.setFlag(ID, "cobertura", cob);
      await actor.update({ "system.stats.armor.cover": "none" });
      await decir(actor, "Fuera de cobertura", `${SIS}/attributes/armor.png`, `<p>Al disparar, <strong>${esc(actor.name)}</strong> deja la cobertura ${COBERTURA[cob]?.nombre ?? ""} hasta su próximo turno.</p>`);
    }
  }
});

// botones dentro de las tarjetas del sistema
Hooks.on("renderChatMessageHTML", (msg, html) => {
  if (game.system?.id !== "mosh") return;
  if (msg.flags?.[ID]?.aplicado) for (const a of html.querySelectorAll('a.content-link[data-uuid*="macros_"]:not([data-uuid*="NsRHfRuuNGPfkYVf"])')) // el enlace de la salvación de muerte sigue vivo
    a.replaceWith(Object.assign(document.createElement("span"), { className: "mr-aplicado", innerHTML: `<i class="fa-solid fa-check" inert></i> ${esc(a.textContent.trim())}`, title: "Ya aplicado" }));
  const card = html.querySelector(".mosh .rollcontainer");
  if (!card || card.querySelector(".mr-botones")) return;
  const raw = msg.content ?? "", botones = [], notas = [];
  const desc = card.querySelector(".description .description > .body:first-child");
  if (desc?.textContent.trim().length > 160) { desc.classList.add("mr-plegada"); desc.addEventListener("click", () => desc.classList.toggle("mr-plegada")); }

  // daño de un arma
  const caja = html.querySelector(".mosh[data-item-id]");
  const tirada = caja?.querySelector(".description a.inline-roll");
  if (on("cbDanio") && tirada) {
    const buscarArma = () => ((caja.dataset.tokenId && canvas.tokens?.get(caja.dataset.tokenId)?.actor) || game.actors.get(caja.dataset.actorId))?.items.get(caja.dataset.itemId);
    if (buscarArma()?.type === "weapon") {
      const datos = () => { const a = buscarArma(); return { danio: Number(tirada.textContent.trim()), aa: !!a?.system?.antiArmor, arma: a?.name ?? "", efecto: a?.system?.woundEffect ?? "", distancia: !/adyacente|adjacent|cuerpo|melee/i.test(String(a?.system?.ranges?.value ?? "")) }; };
      botones.push(["fa-crosshairs", "Objetivos", () => aplicarA([...game.user.targets], datos()), "Aplicar el daño a los tokens marcados (T)"]);
      botones.push(["fa-users", "Selección", () => aplicarA(canvas.tokens.controlled, datos()), "Aplicar el daño a los tokens seleccionados"]);
      // los enlaces «Efecto de herida» del sistema suman una herida al pulsarlos: con el daño automático la tabla se tira sola
      const cuerpo = card.querySelector('.description .body a.content-link[data-uuid*="macros_"]')?.closest(".body");
      const tipos = String(buscarArma().system.woundEffect ?? "").split(/\s+(?:or|o|\+)\s+/i).map(herida).filter(Boolean).map(h => h.nombre).join(" o ");
      if (cuerpo) cuerpo.innerHTML = `<br><strong>Efecto de herida</strong><div class="mr-herida-tipo">${esc(tipos)}</div><p class="mr-nota">Si el daño causa una herida, la tabla se tira sola al aplicarlo.</p>`;
    }
  }
  const muerte = msg.flags?.[ID]?.muerte, quien = muerte && fromUuidSync(muerte);
  if (muerte && game.user.isGM) botones.push(["fa-eye-slash", "Tirar en secreto", () => tirarMuerte(fromUuidSync(muerte), true), "Tirada a ciegas del Guardián: solo se revela cuando alguien compruebe sus constantes vitales"]);
  if (muerte && (game.user.isGM || quien?.isOwner)) botones.push(["fa-dice-d20", "Tirar salvación", () => tirarMuerte(fromUuidSync(muerte), false), "Tirada abierta de salvación de muerte, con ventaja o desventaja si procede"]);
  const quitar = msg.flags?.[ID]?.quitar;
  if (quitar) botones.push(["fa-hand-holding-medical", quitar.texto, async () => { const a = await fromUuid(quitar.uuid); if (a) ejecutar("quitar", a, quitar.flag); }]);

  // respuestas al trauma
  const actor = ChatMessage.getSpeakerActor(msg.speaker);
  if (on("cbTrauma") && actor?.type === "character") {
    const tipo = />\s*Panic Check\s*</.test(raw) ? "panico" : /Sanity Save/.test(raw) && /did not roll/.test(raw) ? "cordura" : /Fear Save|Salvación de Miedo|Sorpresa/.test(raw) ? "miedo" : null;
    const cls = String(actor.system.class?.value ?? "");
    for (const [re, cuando, texto, fn] of TRAUMA) if (tipo === cuando && re.test(cls)) {
      notas.push(`<strong>Respuesta al trauma:</strong> ${esc(actor.system.other?.stressdesc?.value || "")}`);
      botones.push(["fa-people-group", texto, () => fn(actor)]);
    }
    if (tipo === "miedo" && cercanos(actor).some(x => /^(androide|android)/i.test(String(x.system.class?.value ?? ""))))
      notas.push("<strong>Androide cerca:</strong> las salvaciones de Miedo de sus aliados cercanos van con desventaja [−].");
  }
  if (!botones.length && !notas.length) return;
  const pie = document.createElement("div");
  pie.className = "mr-botones";
  pie.innerHTML = notas.map(n => `<p class="mr-nota">${n}</p>`).join("") + botones.map(([i, t, , tip], n) => `<button type="button" data-n="${n}"${tip ? ` data-tooltip="${tip}"` : ""}><i class="fa-solid ${i}" inert></i> ${t}</button>`).join("");
  pie.addEventListener("click", ev => { const n = ev.target.closest("button")?.dataset.n; if (n != null) botones[n][2](); });
  card.append(pie);
});

async function aplicarA(tokens, datos) {
  if (!tokens.length) return ui.notifications.warn("Marca un objetivo (T) o selecciona un token.");
  for (const t of tokens) if (t.actor) await ejecutar("danio", t.actor, datos);
}

// estados del token al cambiar salud, heridas, armadura o condiciones
Hooks.on("updateActor", a => sincronizar(a));
for (const h of ["createItem", "updateItem", "deleteItem"]) Hooks.on(h, i => sincronizar(i.parent));
