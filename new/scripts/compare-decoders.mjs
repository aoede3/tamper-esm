import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import createTamper from '../clients/js/src/tamper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const canonicalDir = path.join(rootDir, 'test', 'canonical-output');
const require = createRequire(import.meta.url);

const legacy = require('../legacy/tamper.cjs');
const legacyTamper = legacy.Tamper();
const esmTamper = createTamper();

function formatError(err) {
  if (err instanceof assert.AssertionError) {
    return err.message;
  }
  return String(err);
}

const files = (await fs.readdir(canonicalDir))
  .filter((file) => file.endsWith('.json'))
  .sort();

const results = [];
let failed = 0;

for (const file of files) {
  const filePath = path.join(canonicalDir, file);
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw);

  try {
    const legacyOut = legacyTamper.unpackData(data);
    const esmOut = esmTamper.unpackData(data);
    assert.deepStrictEqual(esmOut, legacyOut);
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
  console.error(`\n${failed} file(s) failed parity checks.`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${results.length} file(s) passed parity checks.`);
}
