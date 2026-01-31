import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { PackSet } from '../encoders/js/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const datasetsDir = path.join(rootDir, 'test', 'datasets');
const canonicalDir = path.join(rootDir, 'test', 'canonical-output');
const configPath = path.join(rootDir, 'test', 'config.json');

const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

function buildPackSet(items) {
  const packSet = new PackSet({
    buffer_url: '',
    default_thumbnail: '',
    default_oneup: ''
  });

  config.attrs.forEach((attr) => {
    packSet.addAttribute({
      attrName: attr.attr_name,
      possibilities: attr.possibilities,
      maxChoices: attr.max_choices,
      display_name: attr.display_name,
      filter_type: attr.filter_type,
      display_type: attr.display_type
    });
  });

  const maxGuid = items.length ? items[items.length - 1].guid : 0;
  packSet.pack(items, { guidAttr: 'guid', maxGuid, numItems: items.length });
  return packSet;
}

function formatError(err) {
  if (err instanceof assert.AssertionError) {
    return err.message;
  }
  return String(err);
}

const files = (await fs.readdir(datasetsDir))
  .filter((file) => file.endsWith('.json'))
  .sort();

const results = [];
let failed = 0;

for (const file of files) {
  const datasetPath = path.join(datasetsDir, file);
  const canonicalPath = path.join(canonicalDir, file);

  const dataset = JSON.parse(await fs.readFile(datasetPath, 'utf8'));
  const canonical = JSON.parse(await fs.readFile(canonicalPath, 'utf8'));

  try {
    const packSet = buildPackSet(dataset.items || []);
    const output = packSet.toPlainObject();
    assert.deepStrictEqual(output, canonical);

    results.push({ file, ok: true });
  } catch (err) {
    results.push({ file, ok: false, error: formatError(err) });
    failed += 1;
  }
}

results.forEach((result) => {
  if (result.ok) {
    console.log(`PASS ${result.file}`);
  } else {
    console.log(`FAIL ${result.file}: ${result.error}`);
  }
});

if (failed > 0) {
  console.error(`\n${failed} file(s) failed encoder parity checks.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${results.length} file(s) passed encoder parity checks.`);
}
