// Generador de personajes: nombre, sexo y biografía a medida de la clase, el equipo, el parche, la baratija y las habilidades.
// Las reservas de texto están en lang/personajes.json (tools/personajes.py); los sufijos {o|a|e} se eligen según el sexo.
const ID = "mr-mothership-es";

// Diálogo «maestra + experta + entrenada»: cada desplegable solo ofrece los requisitos previos de la habilidad elegida arriba

const prerrequisitos = id => { try { return JSON.parse(document.querySelector(`#${id}`)?.selectedOptions?.[0]?.dataset.prerequisite_ids || "[]"); } catch { return []; } };
const filtrar = (id, permitidos) => {
  const sel = document.querySelector(`#${id}`); if (!sel) return;
  for (const o of sel.options) { o.dataset.ocupada ??= o.disabled ? "1" : "0"; const ok = !o.value || !permitidos.length || permitidos.includes(o.value); o.hidden = !ok; o.disabled = !ok || o.dataset.ocupada === "1"; }
  if (sel.selectedOptions[0]?.hidden) sel.value = "";
};
// Foundry elimina los onchange="" en línea del HTML de los diálogos, así que se escucha el cambio desde el documento
document.addEventListener("change", ev => {
  if (ev.target.id === "dropdownMaster") { filtrar("dropdownExpert", prerrequisitos("dropdownMaster")); filtrar("dropdownTrained", []); }
  else if (ev.target.id === "dropdownExpert") filtrar("dropdownTrained", prerrequisitos("dropdownExpert"));
});
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

      // la ventana se ajusta a su contenido (sin pasar del alto de la pantalla): el bloque de biografía y las listas la desbordaban
      const form = app.element?.[0]?.querySelector("form");
      if (!form) return;
      const ajustar = () => {
        const el = app.element?.[0]; if (!el) return;
        const cab = el.querySelector(".window-header")?.offsetHeight ?? 30;
        const alto = Math.min(form.scrollHeight + cab + 10, window.innerHeight - 30);
        app.setPosition({ height: alto, top: Math.max(10, Math.min(app.position.top, window.innerHeight - alto - 15)) });
      };
      let t;
      new MutationObserver(() => { clearTimeout(t); t = setTimeout(ajustar, 120); })
        .observe(form, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["hidden"] });
      setTimeout(ajustar, 350);
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

    // lista de clases: bajo cada nombre, un resumen de una línea en vez de «Clase - módulo»
    let resumen = {};
    fetch(`modules/${ID}/lang/clases-resumen.json`).then(r => r.json()).then(j => { resumen = j; }).catch(() => { });
    const fillClases = proto.fill_class_options;
    proto.fill_class_options = async function (html) {
      await fillClases.call(this, html);
      for (const o of html.find("option.class_option")) {
        const r = resumen[o.value]; if (r) o.label = r;
      }
    };

    // los poderes psiónicos no salen en las elecciones normales de habilidades: se ofrecen aparte
    const esPoder = d => d.getFlag?.(ID, "psionica");
    const getAllSkills = proto.getAllSkills;
    proto.getAllSkills = async function (...a) { return (await getAllSkills.apply(this, a)).filter(d => !esPoder(d)); };
    const poderes = async () => (await game.packs.get(`${ID}.habilidades`).getDocuments()).filter(esPoder);

    // la tirada de equipo trae «N habilidades», «N psiónicas» y «N créditos» como objetos: se convierten en lo que son
    const MARCADOR = /^\s*(\d+)\s+(habilidades?|psi[oó]nicas?|cr[eé]ditos?)\s*$/i;
    const SKILL_DIALOG = "systems/mosh/templates/dialogs/actor-generator/actor-generator-skill-option-single-dialog.html";
    const uuidsHabilidades = html => String(html.find('input[id="system.class.skills.uuid"]').prop("value") ?? "").split(",").filter(Boolean);
    const rollLoadout = proto.rollLoadout;
    proto.rollLoadout = async function (html) {
      await rollLoadout.call(this, html);
      const ul = html.find('ul[id="system.class.loadout.text"]')[0];
      if (!ul) return;
      const campo = html.find('input[id="system.class.loadout.uuid"]');
      const ids = String(campo.prop("value") ?? "").split(",").filter(Boolean);
      let creditos = null, habilidades = 0, psionicas = 0;
      for (const li of ul.querySelectorAll("li")) {
        for (const a of li.querySelectorAll("a.content-link")) {
          const m = MARCADOR.exec(a.textContent.replace(/\s+/g, " ")); if (!m) continue;
          const n = Number(m[1]), tipo = m[2].toLowerCase();
          if (tipo.startsWith("hab")) habilidades += n; else if (tipo.startsWith("psi")) psionicas += n; else creditos = (creditos ?? 0) + n;
          const i = ids.indexOf(String(a.dataset.uuid ?? "").replace(/.*\./, "")); if (i >= 0) ids.splice(i, 1);
          a.replaceWith("\u0001");
        }
        li.innerHTML = li.innerHTML.replace(/,\s*\u0001/g, "").replace(/\u0001\s*,\s*/g, "").replace(/\u0001/g, "");
        if (!li.textContent.trim()) li.remove();
      }
      campo.prop("value", ids.join(","));
      if (creditos !== null) { // los créditos de la tabla de equipo son los de la clase: sustituyen a la tirada
        html.find('img[id="system.credits.value"]').prop("hidden", true);
        html.find('input[id="system.credits.value"]').prop("hidden", false).prop("value", creditos);
      }
      if (habilidades) { // es el total de habilidades: se completa lo que falte hasta llegar a él
        const pw = new Set((await poderes()).map(d => d.uuid));
        const tengo = uuidsHabilidades(html).filter(u => !pw.has(u)).length;
        const faltan = Math.max(0, habilidades - tengo);
        if (faltan) ui.notifications.info(`La tabla pide ${habilidades} habilidades y tienes ${tengo}: elige ${faltan} más.`);
        for (let i = 0; i < faltan; i++) await this.showSkillDialog(SKILL_DIALOG, "Trained");
      }
      for (let i = 1; i <= psionicas; i++) await elegirPoder(this, html, i, psionicas);
    };
    async function elegirPoder(app, html, n, total) {
      const tengo = new Set(uuidsHabilidades(html));
      const ops = (await poderes()).map(d => `<option value="${d.uuid}"${tengo.has(d.uuid) ? " disabled" : ""}>${esc(d.name.replace(/^Psiónica: /, ""))}</option>`).join("");
      const uuid = await foundry.applications.api.DialogV2.wait({
        window: { title: `Poder psiónico ${n} de ${total}` }, classes: ["macro-popup-dialog"], position: { width: 560 }, rejectClose: false,
        content: `<div class="mosh characterGeneratorSkillPopup"><p class="skillpopupDescription">Elige un poder psiónico distinto de los que ya tienes:</p>
          <div class="dropdownSkill"><select name="poder"><option value="">---</option>${ops}</select></div></div>`,
        buttons: [{ action: "ok", label: "Guardar", icon: "fa-solid fa-check", default: true, callback: (ev, btn) => btn.form.elements.poder.value }],
      });
      if (!uuid) return;
      app.skillsUuid.push(uuid);
      await app.updateSkillHtmlUl(html, [uuid]);
    }

    // los desplegables de habilidades se convierten en una lista: al pasar el cursor por una opción se lee su descripción
    const info = new Map();
    const resumenDe = async uuid => {
      if (!info.has(uuid)) {
        const d = await fromUuid(uuid).catch(() => null);
        const pre = await Promise.all((d?.system?.prerequisite_ids ?? []).map(u => fromUuid(u).then(x => x?.name).catch(() => null)));
        const texto = String(d?.system?.description ?? "").replace(/<\/p>\s*<p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").split("\n")[0].replace(/\s+/g, " ").trim();
        info.set(uuid, { nombre: d?.name?.replace(/^Psiónica: /, "") ?? "", rango: d?.system?.rank, texto, pre: pre.filter(Boolean) });
      }
      return info.get(uuid);
    };
    const RANGOS = { Trained: "Entrenada", Expert: "Experta", Master: "Maestra" };
    Hooks.on("renderDialogV2", (app, el) => {
      // DialogV2 mete el contenido en su propio formulario y el HTML descarta el <form> de la plantilla: se detecta por los desplegables
      const sels = [...el.querySelectorAll('select[name^="dropdown"], select[name="poder"]')];
      if (!sels.length || el.dataset.mrLista) return;
      el.dataset.mrLista = "1";
      const cont = sels[0].closest(".mosh") ?? sels[0].parentElement.parentElement;
      const desc = document.createElement("div");
      desc.className = "mr-desc";
      const ayuda = "Pasa el cursor por una habilidad para leer qué hace.";
      desc.textContent = ayuda;
      const pintores = [];
      for (const sel of sels) {
        const caja = document.createElement("div");
        caja.className = "mr-lista"; caja.setAttribute("role", "listbox");
        sel.hidden = true; sel.after(caja);
        const mostrar = async uuid => {
          if (!uuid) { desc.textContent = ayuda; return; }
          const i = await resumenDe(uuid);
          desc.innerHTML = `<strong>${esc(i.nombre)}</strong> <small>${RANGOS[i.rango] ?? ""}</small><p>${esc(i.texto)}</p>${i.pre.length ? `<p class="mr-pre">Requiere: ${esc(i.pre.join(" o "))}</p>` : ""}`;
        };
        const pintar = () => {
          caja.replaceChildren();
          for (const o of sel.options) {
            if (!o.value || o.hidden) continue;
            const b = document.createElement("button");
            b.type = "button"; b.className = "mr-op"; b.textContent = o.textContent.trim(); b.disabled = o.disabled;
            b.setAttribute("role", "option"); b.setAttribute("aria-selected", String(o.value === sel.value));
            if (o.value === sel.value) b.classList.add("sel");
            b.addEventListener("mouseenter", () => mostrar(o.value)); b.addEventListener("focus", () => mostrar(o.value));
            b.addEventListener("mouseleave", () => mostrar(sel.value)); b.addEventListener("blur", () => mostrar(sel.value));
            b.addEventListener("click", () => {
              sel.value = sel.value === o.value ? "" : o.value;
              sel.dispatchEvent(new Event("change", { bubbles: true }));
              pintores.forEach(p => p()); mostrar(sel.value);
            });
            caja.append(b);
          }
        };
        pintores.push(pintar); pintar();
      }
      cont.append(desc);
      app.setPosition({ height: "auto" });
    });
  } catch (e) { console.warn(`${ID} | no se pudo ampliar el generador de personajes`, e); }
});
