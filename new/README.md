# New ESM Prototype (Tamper)

This directory contains ESM-native versions of the Tamper decoder and encoder,
plus parity tooling to keep output identical to the legacy implementation.

## Requirements

- Node.js (ESM-capable; tested locally with current LTS).
- Parity scripts are dependency-free; encoder runtime uses a local `bitsy` shim in
  `new/vendor/bitsy` to avoid network installs.

## Directory layout

- `new/clients/js/src/tamper.js`: ESM decoder implementation.
- `new/encoders/js/`: ESM encoder implementation.
- `new/legacy/tamper.cjs`: frozen copy of the legacy decoder (CommonJS).
- `new/scripts/`: parity runner scripts.
- `new/test/`:
- `canonical-output/`: golden JSON packs for strict parity checks.
- `datasets/`: source datasets used to generate packs.
- `packs/`: decoder-only sample packs (no canonical output expected).
- `config.json`: encoder attribute configuration.
  - `node_modules/`: small shims (`atob`, `underscore`) for the legacy decoder copy.

## Client decoder (ESM)

Exports:
- `Tamper` (object with decoder methods)
- `createTamper()` (factory)
- default export (alias of `createTamper`)

Example:

```js
import createTamper from './clients/js/src/tamper.js';
import fs from 'node:fs/promises';

const tamper = createTamper();
const data = JSON.parse(await fs.readFile('pack.json', 'utf8'));
const items = tamper.unpackData(data);
```

## Encoder (ESM)

Entry points:
- Node/standard ESM: `new/encoders/js/index.js`
- Browser/edge: build from core + env adapter

Exports:
- `createPackSet`, `PackSet`
- pack classes: `Pack`, `IntegerPack`, `BitmapPack`, `ExistencePack`

Example:

```js
import { createPackSet } from './encoders/js/index.js';

const tamp = createPackSet();
// configure attributes + pack data...
const json = tamp.toJSON();
```

Browser/edge example (core + env adapter):

```js
import createEncoder from './encoders/js/core/createEncoder.js';
import browserEnv from './encoders/js/env/browser.js';

const { createPackSet } = createEncoder(browserEnv);

const tamp = createPackSet();
// configure attributes + pack data...
const json = tamp.toJSON();
```

## Parity checks (strict)

Decoder parity compares legacy output vs ESM output:

```bash
node new/scripts/compare-decoders.mjs
```

Encoder parity builds packs from datasets and compares the full JSON output
against the canonical fixtures (strict field-by-field match):

```bash
node new/scripts/compare-encoders.mjs
```

## NPM scripts

From repo root:

```bash
npm --prefix new run test:decoders
npm --prefix new run test:encoders
npm --prefix new test
npm --prefix new run test:all
```

## Notes

- The encoder output is tuned to match the canonical JSON exactly
  (including fields like `max_guid` and the full existence metadata).
- This `new/` directory is isolated from the legacy code; no files outside
  `new/` are modified.
- The browser encoder uses `Uint8Array` + `DataView` and a local bitset
  implementation (no Node `Buffer` required).

## Expected output

When both suites pass, you should see something like:

```text
PASS large.json
PASS run.json
PASS run2.json
PASS small.json
PASS small2.json
PASS sparse.json
PASS spstart.json

All 7 file(s) passed parity checks.
PASS large.json
PASS run.json
PASS run2.json
PASS small.json
PASS small2.json
PASS sparse.json
PASS spstart.json

All 7 file(s) passed encoder parity checks.
```
