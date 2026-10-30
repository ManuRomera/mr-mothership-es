// Compila _data/<pack>.json a packs/<pack> (LevelDB) con el formato de compendios de Foundry v13.
import fs from "node:fs/promises";
import { ClassicLevel } from "classic-level";

const manifest = JSON.parse(await fs.readFile("module.json"));
const carpetas = JSON.parse(await fs.readFile("_data/carpetas-habilidades.json"));
const hijos = { RollTable: ["results", "tables"], JournalEntry: ["pages", "journal"] };
const clave = { Item: "items", RollTable: "tables", JournalEntry: "journal" };

for (const pack of manifest.packs) {
  await fs.rm(pack.path, { recursive: true, force: true });
  const db = new ClassicLevel(pack.path, { valueEncoding: "json" });
  await db.open();
  const docs = JSON.parse(await fs.readFile(`_data/${pack.name}.json`));
  const col = clave[pack.type];
  const lote = db.batch();
  for (const d of docs) {
    const doc = { ...d, _stats: { systemId: "mosh", coreVersion: "13", createdTime: 0, modifiedTime: 0 } };
    const h = hijos[pack.type];
    if (h) {
      for (const e of d[h[0]]) lote.put(`!${col}.${h[0]}!${d._id}.${e._id}`, e);
      doc[h[0]] = d[h[0]].map(e => e._id);
    }
    lote.put(`!${col}!${d._id}`, doc);
  }
  if (pack.name === "habilidades") for (const f of carpetas) lote.put(`!folders!${f._id}`, f);
  await lote.write();
  await db.close();
  console.log(`pack ${pack.name}: ${docs.length}`);
}
