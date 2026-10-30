// Combate: «Aplicar daño» desde la tarjeta de un ataque con éxito, con las reglas de la Guía de supervivencia (cap. 28-29):
// reducción de daño primero; la cobertura (solo a distancia) y la armadura ignoran el daño menor que sus PA y se destruyen
// si reciben daño igual o mayor, pasando el resto; antiarmadura (AA) ignora y destruye la armadura; al llegar la salud a 0
// se tira la herida del tipo del arma; con las heridas al máximo, salvación de muerte oculta para el Guardián.
const ID = "mr-mothership-es";
const COBERTURA = { insignificant: { pa: 5, rd: 0, nombre: "insignificante" }, light: { pa: 10, rd: 0, nombre: "ligera" }, heavy: { pa: 20, rd: 5, nombre: "pesada" } };
const HERIDAS = [ // [patrón en system.woundEffect, ajuste de la tabla del sistema]
  [/bleeding|sangrado/i, "table1eWoundBleeding"], [/blunt|contundente/i, "table1eWoundBluntForce"], [/gunshot|disparo/i, "table1eWoundGunshot"],
  [/fire|fuego|explosiv/i, "table1eWoundFireExplosives"], [/gore|desgarr|masiv/i, "table1eWoundGoreMassive"]];
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Tipo de herida del arma y si va con ventaja/desventaja: «Gunshot [+]» → tabla de disparo con 1d10 [+]. */
function herida(efecto = "") {
  const primero = String(efecto).split(/\s+(?:or|o)\s+/i)[0];
  const t = HERIDAS.find(([re]) => re.test(primero));
  if (!t) return null;
  return { ajuste: t[1], dado: /\[\+\]/.test(primero) ? "1d10 [+]" : /\[[-–]\]/.test(primero) ? "1d10 [-]" : "1d10" };
}

async function buscarTabla(id) {
  const t = id && (await fromUuid(id).catch(() => null));
  if (t) return t;
  for (const p of game.packs.filter(p => p.documentName === "RollTable")) if (p.index.has(id)) return p.getDocument(id);
  return game.tables.get(id) ?? null;
}

/** Aplica el daño a un actor (debe ejecutarse con permisos sobre él). */
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
  // salud y heridas (cap. 28.2): al llegar a 0 se sufre una herida y la salud vuelve al máximo menos el daño sobrante;
  // un golpe enorme puede encadenar varias heridas. Con las heridas al máximo, muerte.
  const maxSalud = Number(actor.system.health.max), maximo = Number(actor.system.hits.max);
  let salud = Number(actor.system.health.value), heridas = Number(actor.system.hits.value), nuevas = 0;
  const saludAntes = salud;
  while (resto > 0 && heridas < maximo) {
    if (resto < salud) { salud -= resto; resto = 0; break; }
    resto -= salud; heridas++; nuevas++;
    salud = heridas < maximo ? maxSalud : 0;
  }
  const h = herida(efecto);
  const conTabla = actor.type === "character" && h && game.settings.get("mosh", "firstEdition");
  if (saludAntes !== salud || nuevas) pasos.push(`Salud ${saludAntes} → <strong>${salud}</strong>${nuevas ? ` · <strong>${nuevas === 1 ? "1 herida" : `${nuevas} heridas`}</strong> (${heridas}/${maximo})` : ""}`);
  else if (!pasos.some(p => /absorbe|Sin daño/.test(p))) pasos.push("<strong>Sin daño</strong>");
  await actor.update({ "system.health.value": salud, ...(conTabla ? {} : { "system.hits.value": heridas }) });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="mr-danio"><h3>${esc(actor.name)} recibe ${danio} de daño${arma ? ` (${esc(arma)})` : ""}</h3><ul>${pasos.map(p => `<li>${p}</li>`).join("")}</ul></div>`
  });
  // la tabla de heridas del sistema suma ella misma la herida (sin esperar a guardarla): una tirada cada vez y se espera al cambio
  if (conTabla) for (let i = 0; i < nuevas; i++) {
    const antes = Number(actor.system.hits.value);
    await actor.rollTable(game.settings.get("mosh", h.ajuste), h.dado, "low", true, false, null, null);
    for (let t = 0; t < 20 && Number(actor.system.hits.value) === antes; t++) await new Promise(r => setTimeout(r, 100));
  }
  if (!nuevas || heridas < maximo) return;
  if (actor.type === "character") {
    const tabla = await buscarTabla(game.settings.get("mosh", "table1eDeath"));
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="mr-danio"><h3>${esc(actor.name)} ha sufrido sus heridas máximas</h3><p>El Guardián tira en secreto la salvación de muerte: se revela cuando alguien dedique un turno a comprobar sus constantes vitales.</p></div>` });
    await tabla?.draw({ rollMode: CONST.DICE_ROLL_MODES.BLIND });
  } else await actor.toggleStatusEffect("dead", { active: true, overlay: true });
}

/** Desde la tarjeta: aplica a los tokens objetivo o seleccionados; lo que no es tuyo lo aplica el Guardián por socket. */
async function aplicarA(tokens, datos) {
  if (!tokens.length) return ui.notifications.warn("Marca un objetivo (T) o selecciona un token.");
  for (const t of tokens) {
    if (!t.actor) continue;
    if (t.actor.isOwner) await aplicar(t.actor, datos.danio, datos);
    else if (game.users.activeGM) game.socket.emit(`module.${ID}`, { accion: "danio", uuid: t.actor.uuid, datos });
    else ui.notifications.warn(`No hay Guardián conectado para aplicar el daño a ${t.name}.`);
  }
}

Hooks.once("ready", () => {
  if (game.system?.id !== "mosh") return;
  game.socket.on(`module.${ID}`, async m => {
    if (m?.accion !== "danio" || game.user !== game.users.activeGM) return;
    const actor = await fromUuid(m.uuid);
    if (actor) await aplicar(actor, m.datos.danio, m.datos);
  });
  const mod = game.modules.get(ID);
  mod.api = Object.assign(mod.api ?? {}, { aplicarDanio: aplicar });
});

Hooks.on("renderChatMessageHTML", (msg, html) => {
  if (game.system?.id !== "mosh") return;
  const card = html.querySelector(".mosh[data-item-id]");
  const tirada = card?.querySelector(".description a.inline-roll");
  if (!tirada || card.querySelector(".mr-aplicar")) return;
  // el arma se busca al pulsar: el sistema reemplaza el objeto al gastar munición y la referencia del render queda vieja
  const buscarArma = () => ((card.dataset.tokenId && canvas.tokens?.get(card.dataset.tokenId)?.actor) || game.actors.get(card.dataset.actorId))?.items.get(card.dataset.itemId);
  if (buscarArma()?.type !== "weapon") return;
  const datos = () => {
    const arma = buscarArma();
    return { danio: Number(tirada.textContent.trim()), aa: !!arma?.system?.antiArmor, arma: arma?.name ?? "", efecto: arma?.system?.woundEffect ?? "",
      distancia: !/adyacente|adjacent|cuerpo|melee/i.test(String(arma?.system?.ranges?.value ?? "")) };
  };
  const pie = document.createElement("div");
  pie.className = "mr-aplicar";
  pie.innerHTML = `<button type="button" data-a="objetivos"><i class="fa-solid fa-crosshairs" inert></i> Aplicar a objetivos</button>
    <button type="button" data-a="seleccion"><i class="fa-solid fa-users" inert></i> A seleccionados</button>`;
  pie.addEventListener("click", ev => {
    const a = ev.target.closest("button")?.dataset.a; if (!a) return;
    aplicarA(a === "objetivos" ? [...game.user.targets] : canvas.tokens.controlled, datos());
  });
  card.append(pie);
});
