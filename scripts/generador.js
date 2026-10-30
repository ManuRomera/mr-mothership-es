// Generador de personajes: nombre, sexo y biografía a medida de la clase, el equipo, el parche, la baratija y las habilidades.
// Las reservas de texto están en lang/personajes.json (tools/personajes.py); los sufijos {o|a|e} se eligen según el sexo.
const ID = "mr-mothership-es";
const SEXOS = [["", "Aleatorio"], ["0", "Hombre"], ["1", "Mujer"], ["2", "No binario"]];
let datos = null;
const cargar = async () => datos ??= await (await fetch(`modules/${ID}/lang/personajes.json`)).json();
const usados = new Map();
const azar = n => Math.floor(Math.random() * n);

/** Elige sin repetir hasta agotar la lista (así dos personajes seguidos no comparten frases). */
function elige(clave, lista) {
  let set = usados.get(clave); if (!set) usados.set(clave, set = new Set());
  let libres = lista.filter(x => !set.has(x)); if (!libres.length) { set.clear(); libres = lista; }
  const x = libres[azar(libres.length)]; set.add(x); return x;
}
const genero = (s, sx) => s.replace(/\{([^{}|]*)\|([^{}|]*)\|([^{}|]*)\}/g, (_, o, a, e) => [o, a, e][sx]);
const frase = s => { s = s.trim(); return /[.!?»"]$/.test(s) ? s : s + "."; };
const minus = s => s.charAt(0).toLowerCase() + s.slice(1);
const lista = a => a.length > 1 ? `${a.slice(0, -1).join(", ")} y ${a.at(-1)}` : a[0] ?? "";
const esc = s => foundry.utils.escapeHTML(s);

function leer(html) {
  const li = id => [...html.find(`ul[id="${id}"] li`)].map(e => e.innerText.replace(/\s+/g, " ").trim()).filter(Boolean);
  const val = id => String(html.find(`input[id="${id}"]`).prop("value") ?? "").trim();
  return {
    clase: val("system.class.value"), equipo: li("system.class.loadout.text"), habilidades: li("system.class.skils.text"),
    parche: val("system.class.patch.text").replace(/[“”"«»]/g, "").trim(), baratija: val("system.class.trinket.text").replace(/[“”"«»]/g, "").trim(),
  };
}

export async function generar({ clase, sexo, equipo = [], habilidades = [], parche = "", baratija = "" }) {
  const d = await cargar();
  const sx = sexo === "" || sexo == null ? azar(3) : Number(sexo);
  const n = d.nombres;
  const pool = d.clases[clase] ?? d.clases[Object.keys(d.clases)[azar(Object.keys(d.clases).length)]];
  const c = k => genero(frase(elige(`${clase}.${k}`, pool[k])), sx);
  const pila = [n.m, n.f, n.x][sx];
  const alias = azar(10) < 4 ? ` «${elige("alias", [...(pool.alias ?? []), ...n.alias])}»` : "";
  const nombre = `${elige("nombre" + sx, pila)}${alias} ${elige("apellido", n.apellidos)}`;
  const edad = 19 + azar(38);

  const p = [`${c("origen")} ${c("trayectoria")}`];
  p.push(`${c("motivacion")} ${c("mania")}`);
  p.push([c("miedo"), azar(10) < 7 ? c("secreto") : ""].join(" ").trim());
  if (azar(10) < 8) p.push(c("relacion"));

  const extra = [];
  if (equipo.length) extra.push(elige("t.equipo", [`Todo su equipaje: ${lista(equipo.map(minus))}.`, `En el petate lleva ${lista(equipo.map(minus))}.`, `Cuando embarcó solo cargaba con ${lista(equipo.map(minus))}.`]));
  if (habilidades.length) extra.push(elige("t.hab", [`Se le da bien ${lista(habilidades.map(minus))}.`, `Sabe de ${lista(habilidades.map(minus))}, y eso le ha salvado más de una vez.`, `Destaca en ${lista(habilidades.map(minus))}.`]));
  if (parche) extra.push(elige("t.parche", [`En el uniforme lleva cosido el parche «${parche}».`, `Su parche dice mucho de su carácter: «${parche}».`, `El parche «${parche}» ya le ha costado alguna discusión.`]));
  if (baratija) extra.push(elige("t.baratija", [`Nunca se separa de esto: ${minus(baratija)}.`, `Su baratija de la suerte: ${minus(baratija)}.`, `Guarda como amuleto ${minus(baratija)}.`]));
  if (extra.length) p.push(extra.join(" "));
  p.push(c("frase"));
  return { nombre, edad, sexo: sx, texto: p.join("\n\n") };
}

const aHtml = t => t.split(/\n{2,}/).map(x => `<p>${esc(x.trim()).replace(/\n/g, "<br>")}</p>`).join("");

Hooks.once("ready", async () => {
  if (game.system?.id !== "mosh") return;
  try {
    const { DLActorGenerator } = await import("/systems/mosh/module/windows/actor-generator.js");
    const proto = DLActorGenerator.prototype;
    const inputNombre = app => app._element.find('input[name="name"]');
    const genericoNombre = n => !n || /^(new |nuev[oa] )?(actor|personaje|character)\b/i.test(n.trim());

    async function rellenar(app, { forzarNombre = false } = {}) {
      const html = app._element, ctx = leer(html);
      if (!ctx.clase) return ui.notifications.warn("Elige primero una clase.");
      // el sexo sale del selector; con «Aleatorio» se conserva el ya sorteado salvo que se pulse el botón
      const elegido = html.find("#mr-sexo").val();
      const r = await generar({ ...ctx, sexo: elegido !== "" ? elegido : (forzarNombre ? "" : app._mrSx ?? "") });
      app._mrSx = r.sexo;
      if (forzarNombre || genericoNombre(inputNombre(app).val()) || (app._mrNombreAuto && !app._mrNombreFijo)) { inputNombre(app).val(r.nombre); app._mrNombreAuto = true; }
      html.find("#mr-bio").val(`${inputNombre(app).val()} tiene ${r.edad} años. ${r.texto}`);
      app._mrBioAuto = true;
    }

    Hooks.on("renderDLActorGenerator", (app, html) => {
      if (html.find("#mr-sexo").length) return;
      const bloque = $(`<div class="mr-gen-bio">
        <div class="mr-gen-fila"><label>Sexo <select id="mr-sexo">${SEXOS.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></label>
        <button type="button" id="mr-nombre-bio"><i class="fa-solid fa-dice" inert></i> Nombre y biografía</button></div>
        <textarea id="mr-bio" rows="7" placeholder="La biografía se genera sola al elegir clase o al pulsar el botón. Puedes editarla."></textarea></div>`);
      html.find("header.char-header").after(bloque);
      html.find("#mr-nombre-bio").on("click", () => rellenar(app, { forzarNombre: true }));
      html.find("#mr-bio").on("input", () => { app._mrBioAuto = false; });
      html.find('input[name="name"]').on("input", () => { app._mrNombreAuto = false; });
    });

    const updateClass = proto.updateClass;
    proto.updateClass = async function (...args) {
      const r = await updateClass.apply(this, args);
      if (!this._element.find("#mr-bio").val() || this._mrBioAuto) await rellenar(this);
      return r;
    };

    // al guardar: si la biografía sigue siendo la automática se rehace con el equipo, el parche y las habilidades ya tirados
    const update = proto._updateObject;
    proto._updateObject = async function (event, formData) {
      const html = this._element;
      if (html.find("#mr-bio").length && leer(html).clase && (!html.find("#mr-bio").val() || this._mrBioAuto)) { this._mrNombreFijo = true; await rellenar(this); }
      if (html.find("#mr-bio").length) formData.name = html.find('input[name="name"]').val() || formData.name;
      const bio = html.find("#mr-bio").val();
      await update.call(this, event, formData);
      if (bio) await this.object.update({ "system.biography": aHtml(bio), "prototypeToken.name": formData.name || this.object.name });
    };
  } catch (e) { console.warn(`${ID} | no se pudo ampliar el generador de personajes`, e); }
});
