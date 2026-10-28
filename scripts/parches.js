// Parches de Mothership (d100, Guía de supervivencia): tirada con tarjeta en el chat, «Coser» al personaje
// como objeto con su imagen y creación de la tabla nativa en el mundo. Imágenes en parches/NN.webp.
const ID = "mr-mothership-es";
const { DialogV2 } = foundry.applications.api;
const img = n => `modules/${ID}/parches/${String(n).padStart(2, "0")}.webp`;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
let lista = null;
const parches = async () => lista ??= await (await fetch(`modules/${ID}/parches/parches.json`)).json();

/** Actor al que se cose: el del token seleccionado o el personaje del usuario. */
const actorActual = () => canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;

export async function tirarParche() {
  const tirada = await new Roll("1d100 - 1").evaluate();
  const n = tirada.total, texto = (await parches())[n];
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker(), rolls: [tirada],
    content: `<div class="mr-parche" data-parche="${n}"><img src="${img(n)}" alt=""><div><h3>Parche ${String(n).padStart(2, "0")}</h3>
      <p>${esc(texto)}</p><button type="button" data-coser="${n}"><i class="fa-solid fa-scissors" inert></i> Coser a mi personaje</button></div></div>`
  });
}

export async function coser(n, actor = actorActual()) {
  if (!actor) return ui.notifications.warn("Selecciona el token de tu personaje o asígnate uno en Configuración de jugador.");
  if (!actor.isOwner) return ui.notifications.warn("Solo puedes coser parches a un personaje tuyo.");
  const texto = (await parches())[n];
  await actor.createEmbeddedDocuments("Item", [{
    name: `Parche: ${texto}`, type: "item", img: img(n),
    system: { description: `<p><img src="${img(n)}" alt="" width="200"></p><p>Parche ${String(n).padStart(2, "0")} de la tabla d100.</p>`, quantity: 1 }
  }]);
  ui.notifications.info(`${actor.name} lleva ahora el parche «${texto}».`);
}

export async function crearTabla() {
  if (!game.user.isGM) return;
  const textos = await parches();
  const existe = game.tables.find(t => t.flags?.[ID]?.parches);
  if (existe) return existe.sheet.render(true);
  const t = await RollTable.create({
    name: "Parches (d100)", formula: "1d100 - 1", replacement: true, displayRoll: true, img: img(0),
    description: "Tira en la creación de personaje para saber qué parche llevas cosido en el traje o el uniforme.",
    flags: { [ID]: { parches: true } },
    results: textos.map((x, n) => ({ type: "text", description: `<p>${esc(x)}</p>`, img: img(n), range: [n, n], weight: 1 }))
  });
  t.sheet.render(true);
}

Hooks.on("renderChatMessageHTML", (msg, html) => {
  html.querySelector(".mr-parche [data-coser]")?.addEventListener("click", ev => coser(Number(ev.currentTarget.dataset.coser)));
});

Hooks.on("renderSettings", (app, html) => {
  if (game.system?.id !== "mosh") return;
  const raiz = html instanceof HTMLElement ? html : html[0];
  const sitio = raiz?.querySelector("section.settings");
  if (!sitio || raiz.querySelector(".mr-parches-ajustes")) return;
  const sec = document.createElement("section");
  sec.className = "mr-parches-ajustes flexcol";
  sec.innerHTML = `<h4 class="divider">Parches (d100)</h4>
    <button type="button" data-parches="tirar"><i class="fa-solid fa-shirt" inert></i> Tirar parche</button>
    ${game.user.isGM ? `<button type="button" data-parches="tabla"><i class="fa-solid fa-table-list" inert></i> Crear la tabla de parches</button>` : ""}`;
  sec.addEventListener("click", ev => {
    const a = ev.target.closest("button[data-parches]")?.dataset.parches;
    if (a === "tirar") tirarParche();
    else if (a === "tabla") crearTabla();
  });
  sitio.after(sec);
});

Hooks.once("ready", () => {
  const mod = game.modules.get(ID);
  mod.api = Object.assign(mod.api ?? {}, { tirarParche, coser, crearTabla });
});
