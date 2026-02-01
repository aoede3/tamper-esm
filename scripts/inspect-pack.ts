import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createTamper from "../clients/js/src/tamper.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const relPath = process.argv[2];
if (!relPath) {
  console.error("Usage: tsx scripts/inspect-pack.ts <path-to-pack.json>");
  process.exit(1);
}

const filePath = path.resolve(rootDir, relPath);
const raw = await fs.readFile(filePath, "utf8");
const data = JSON.parse(raw);
const tamper = createTamper();
const items = tamper.unpackData(data);

const stat = await fs.stat(filePath);
const attributes = data.attributes || [];
const existence = data.existence || {};

function packBytes(pack) {
  if (!pack) return 0;
  return Buffer.from(pack, "base64").length;
}

let totalPackBytes = packBytes(existence.pack);
const perAttr = attributes.map((attr) => {
  const bytes = packBytes(attr.pack);
  totalPackBytes += bytes;
  return {
    attr_name: attr.attr_name,
    encoding: attr.encoding,
    bytes,
  };
});

console.log(`file: ${path.relative(rootDir, filePath)}`);
console.log(`json_bytes: ${stat.size}`);
console.log(`items: ${items.length}`);
console.log(`existence_bytes: ${packBytes(existence.pack)}`);
console.log(`total_pack_bytes: ${totalPackBytes}`);
console.log("attributes:");
perAttr.forEach((attr) => {
  console.log(`  - ${attr.attr_name} (${attr.encoding}): ${attr.bytes}`);
});
