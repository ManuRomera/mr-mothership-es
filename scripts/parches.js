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

/** Tira el d100 y publica la tarjeta. `conBoton:false` la deja sin «Coser» (la usa el generador, que ya lo cose al guardar). */
export async function tirarParche({ conBoton = true } = {}) {
  const tirada = await new Roll("1d100 - 1").evaluate();
  const n = tirada.total, texto = (await parches())[n];
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(), rolls: [tirada],
    content: `<div class="mr-parche" data-parche="${n}"><img src="${img(n)}" alt=""><div><h3>Parche ${String(n).padStart(2, "0")}</h3>
      <p>${esc(texto)}</p>${conBoton ? `<button type="button" data-coser="${n}"><i class="fa-solid fa-scissors" inert></i> Coser a mi personaje</button>` : ""}</div></div>`
  });
  return { n, texto };
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

// --- Generador de personajes del sistema: el parche sale de nuestra tabla d100 y se cose al guardar ---
Hooks.once("init", () => {
  game.settings.register(ID, "parchesGenerador", {
    name: "Parches del módulo en el generador de personajes",
    hint: "Al tirar el parche en el generador de personajes se usa la tabla d100 de este módulo (con imagen) en lugar de la tabla de la clase. Se cose al personaje como objeto al guardar.",
    scope: "world", config: true, type: Boolean, default: true
  });
});

Hooks.once("ready", async () => {
  if (game.system?.id !== "mosh") return;
  try {
    const { DLActorGenerator } = await import("/systems/mosh/module/windows/actor-generator.js");
    // tirada de tablas del generador: el original solo entiende un @UUID por resultado; los equipos iniciales traen varios (con «x2»)
    const editor = foundry.applications.ux.TextEditor.implementation;
    const cantidad = etiqueta => { const m = String(etiqueta || "").match(/(?:^|[\s(])x\s*(\d+)(?:\)|$|\s)/i); return m ? Math.max(1, Number(m[1])) : 1; };
    DLActorGenerator.prototype.rollTable = async function (html, id, tableId, type = "input") {
      const imgTirar = html.find(`img[id="${id}.value"]`);
      if (imgTirar.prop("hidden") !== false || html.find('img[id="system.class.value"]').prop("value") === "") return;
      const tabla = await fromUuid(tableId);
      if (!tabla) return ui.notifications.error(game.i18n.localize("Mosh.CharacterGenerator.Error.NoClass"));
      const { results } = await tabla.draw({ displayChat: true });
      const uuids = []; let texto = "";
      for (const r of results) {
        if (r.type === "pack" || r.type === "document") {
          if (type === "ul") html.find(`ul[id="${id}.text"]`).append(`<li>${r.name}</li>`); else texto += `${r.name}; `;
          uuids.push(r.documentUuid);
        } else if (r.type === "text") {
          const d = r.description || "";
          for (const m of d.matchAll(/@UUID\[([^\]]+)\](?:\{([^}]+)\})?/g)) for (let i = 0; i < cantidad(m[2]); i++) uuids.push(m[1].replace(/.*\./, ""));
          if (type === "ul") html.find(`ul[id="${id}.text"]`).append(`<li>${await editor.enrichHTML(d, { async: true })}</li>`);
          else texto += d.replace(/@UUID\[([^\]]+)\](?:\{([^}]+)\})?/g, "$2").replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ").trim();
        }
      }
      imgTirar.prop("hidden", true);
      html.find(`input[id="${id}.value"]`).prop("hidden", false).prop("value", results[0].range[0]);
      html.find(`input[id="${id}.text"]`).prop("hidden", false).prop("value", texto);
      html.find(`input[id="${id}.uuid"]`).prop("value", uuids.join(","));
    };
    const original = DLActorGenerator.prototype.rollPatch;
    DLActorGenerator.prototype.rollPatch = async function (html) {
      const clase = html.find('img[id="system.class.value"]').prop("value"); // como el original: en una <img> es undefined, no cuenta como vacío
      if (!game.settings.get(ID, "parchesGenerador") || clase === "" || !this.patchTable) return original.call(this, html);
      if (html.find('img[id="system.class.patch.value"]').prop("hidden") !== false) return;
      const { n, texto } = await tirarParche({ conBoton: false });
      html.find('img[id="system.class.patch.value"]').prop("hidden", true);
      html.find('input[id="system.class.patch.value"]').prop("hidden", false).prop("value", n);
      html.find('input[id="system.class.patch.text"]').prop("hidden", false).prop("value", texto);
      html.find('input[id="system.class.patch.uuid"]').prop("value", `mr-parche-${n}`);
    };
    // al guardar, el generador llama a modifyItem con el identificador del parche: lo cosemos en vez de buscar un objeto
    const proto = CONFIG.Actor.documentClass.prototype;
    const modifyItem = proto.modifyItem;
    proto.modifyItem = function (itemId, cantidad) {
      const m = /^mr-parche-(\d+)$/.exec(String(itemId));
      return m ? coser(Number(m[1]), this) : modifyItem.call(this, itemId, cantidad);
    };
  } catch (e) { console.warn(`${ID} | no se pudo integrar el generador de personajes`, e); }
});

// Lupa: al pasar el cursor por la miniatura de un parche en la ficha se ve la imagen grande.
Hooks.on("renderActorSheet", (app, html) => {
  const raiz = html instanceof HTMLElement ? html : html[0];
  for (const i of raiz?.querySelectorAll(`img[src*="/${ID}/parches/"]`) ?? []) {
    i.dataset.tooltipHtml = `<img src="${i.getAttribute("src")}" alt="" style="width:260px;border-radius:6px;display:block">`;
    i.dataset.tooltipDirection = "RIGHT";
  }
});
