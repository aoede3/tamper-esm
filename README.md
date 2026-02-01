# Tamper (ESM)

**ESM encoder/decoder for Tamper - a compact format for bulk categorical datasets.**

This repository contains an ESM-native implementation of the Tamper encoder and decoder format originally developed at the New York Times, plus strict parity tooling to ensure identical output to the frozen legacy implementation.

This project is an independent ESM implementation of the Tamper format. It does not define a new format and is not affiliated with the original NYT repository.

Tamper is a **column-oriented packer for tabular categorical data** (low-cardinality enums, booleans, bucketed integers) where JSON + compression becomes inefficient.

## References

- [Original NYT Tamper repository](https://github.com/nytimes/tamper)
- [NYT Tamper project documentation](https://nytimes.github.io/tamper/)
- [Original NYT announcement / background](https://archive.nytimes.com/open.blogs.nytimes.com/2014/04/16/introducing-pourover-and-tamper/)
- [unsetbit/tamp community encoder implementation](https://github.com/unsetbit/tamp)

---

## When to use this

Tamper is a good fit when your data is:

- **Tabular** (many rows with the same attributes)
- **Categorical-heavy** (enums, booleans, small integers)
- **Bulk** (transferred or stored as snapshots)
- **Read-mostly / immutable**
- Required to match **legacy Tamper output exactly**

Use cases:

- Analytics extracts for dashboards
- Lookup / reference tables
- ML-style categorical feature matrices shipped to JS or WASM

## When _not_ to use this

Do **not** use Tamper for:

- Nested or hierarchical objects
- General APIs or CRUD payloads
- Arbitrary graphs
- Free-form documents or HTML

If your data is not mostly categorical and tabular, JSON + Brotli/Zstd or a schema-based format (e.g. Protobuf, Arrow) will likely be a better fit.

---

## Overview

**Tamper** is a data serialisation protocol originally developed at the New York Times to efficiently transfer large categorical datasets from server to browser.

This repository provides a **modern ESM implementation** of the original CommonJS codebase, with:

- identical encoded output
- identical decoded results
- strict, automated parity checks against the frozen legacy implementation

---

## Core encoding approach

Tamper packs categorical columns using bitwise encodings, automatically selecting the most efficient strategy per attribute:

- **Integer packing** - sparse or bounded integer values
- **Bitmap packing** - dense categorical values
- **Existence packing** - tracks presence using run-length encoding

These strategies are chosen automatically by the encoder based on observed data characteristics.

---

## Repository structure

```
├── clients/js/src/         # ESM decoder (browser-side)
├── encoders/js/
│   ├── core/               # Environment-agnostic encoder logic
│   └── env/                # Node.js & browser adapters
├── legacy/                 # Frozen legacy implementation (reference only)
├── vendor/bitsy/           # Vendored bitset library (no npm deps)
├── scripts/                # Parity verification tools
└── test/                   # Test datasets & canonical outputs
```

---

## Requirements

- Node.js (ESM-capable; tested with current LTS)
- npm (for installing dev tooling)
- Encoder runtime uses a local `vendor/bitsy` shim (no network installs)

Install dev dependencies for TSX-driven scripts:

```bash
npm install
```

---

## Usage

### Decoder (ESM)

Exports:

- `createTamper()` - decoder factory
- `Tamper` - decoder methods
- default export - alias of `createTamper`

```js
import createTamper from "./clients/js/src/tamper.ts";
import fs from "node:fs/promises";

const tamper = createTamper();
const pack = JSON.parse(await fs.readFile("pack.json", "utf8"));
const items = tamper.unpackData(pack);
```

---

### Encoder (ESM)

Entry points:

- Node / standard ESM: `encoders/js/index.ts`
- Browser / edge: compose core + environment adapter

Exports:

- `createPackSet`, `PackSet`
- `Pack`, `IntegerPack`, `BitmapPack`, `ExistencePack`

```js
import { createPackSet } from "./encoders/js/index.ts";

const tamp = createPackSet();
// configure attributes + pack data...
const json = tamp.toJSON();
```

Browser / edge example:

```js
import createEncoder from "./encoders/js/core/createEncoder.ts";
import browserEnv from "./encoders/js/env/browser.ts";

const { createPackSet } = createEncoder(browserEnv);

const tamp = createPackSet();
// configure attributes + pack data...
const json = tamp.toJSON();
```

---

## Parity verification (strict)

Decoder parity compares decoded output from the legacy and ESM implementations:

```bash
tsx scripts/compare-decoders.ts
```

Encoder parity builds packs from test datasets and compares full JSON output against canonical fixtures:

```bash
tsx scripts/compare-encoders.ts
```

The ESM implementation is considered correct only when **all canonical fixtures match byte-for-byte**.

---

## Notes

- Encoder output is tuned to exactly match canonical JSON fixtures (including legacy fields such as `max_guid` and existence metadata).
- The legacy implementation is retained **only** for parity verification and reference; it is not used at runtime.
- The browser encoder uses `Uint8Array` and `DataView` and does not depend on Node.js `Buffer`.

---

## Expected output

```text
PASS large.json
PASS run.json
PASS run2.json
PASS small.json
PASS small2.json
PASS sparse.json
PASS spstart.json

All 7 file(s) passed parity checks.
...
All 7 file(s) passed encoder parity checks.
```
