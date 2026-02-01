import { describe, it, expect } from "vitest";
import { readFile } from "fs/promises";
import { join } from "path";
import createEncoder from "../../encoders/js/core/createEncoder";
import nodeEnv from "../../encoders/js/env/node";
import { createTamper } from "../../clients/js/src/tamper";

const DATASETS_DIR = join(process.cwd(), "test/datasets");
const CANONICAL_DIR = join(process.cwd(), "test/canonical-output");
const CONFIG_PATH = join(process.cwd(), "test/config.json");

describe("Canonical Dataset Integration Tests", () => {
  const datasets = [
    "small",
    "small2",
    "large",
    "sparse",
    "spstart",
    "run",
    "run2",
  ];

  const encoder = createEncoder(nodeEnv);
  const tamper = createTamper();

  async function loadDataset(name: string) {
    const path = join(DATASETS_DIR, `${name}.json`);
    const content = await readFile(path, "utf-8");
    const data = JSON.parse(content);
    // Datasets have an "items" property
    return data.items || data;
  }

  async function loadCanonical(name: string) {
    const path = join(CANONICAL_DIR, `${name}.json`);
    const content = await readFile(path, "utf-8");
    return JSON.parse(content);
  }

  async function loadConfig() {
    const content = await readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(content);
  }

  describe("Encoder Parity", () => {
    datasets.forEach((datasetName) => {
      it(`encodes ${datasetName}.json to match canonical output`, async () => {
        const items = await loadDataset(datasetName);
        const canonical = await loadCanonical(datasetName);
        const config = await loadConfig();

        // Build PackSet with same attributes as canonical
        const packSet = encoder.createPackSet();

        config.attrs.forEach((attr: any) => {
          packSet.addAttribute({
            attrName: attr.attr_name,
            possibilities: attr.possibilities,
            maxChoices: attr.max_choices,
            display_name: attr.display_name || "",
            filter_type: attr.filter_type || "",
            display_type: attr.display_type || "",
          });
        });

        // Pack the data
        const maxGuid = items[items.length - 1].guid;
        packSet.pack(items, {
          guidAttr: "guid",
          maxGuid,
          numItems: items.length,
        });

        const output = packSet.toPlainObject();

        // Compare existence pack
        expect(output.existence.pack).toBeDefined();
        expect(output.existence.encoding).toBe("existence");

        // Compare number of attributes
        const outputAttrs = output.attributes.filter(
          (a: any) => a.encoding !== undefined
        );
        const canonicalAttrs = canonical.attributes.filter(
          (a: any) => a.encoding !== undefined
        );
        expect(outputAttrs.length).toBe(canonicalAttrs.length);

        // Compare each attribute structure
        outputAttrs.forEach((attr: any, i: number) => {
          const canonAttr = canonicalAttrs[i];
          expect(attr.encoding).toBe(canonAttr.encoding);
          expect(attr.attr_name).toBe(canonAttr.attr_name);
          expect(attr.possibilities).toEqual(canonAttr.possibilities);
        });
      });
    });
  });

  describe("Decoder Parity", () => {
    datasets.forEach((datasetName) => {
      it(`decodes ${datasetName}.json canonical output correctly`, async () => {
        const originalItems = await loadDataset(datasetName);
        const canonical = await loadCanonical(datasetName);

        // Decode the canonical output
        const decoded = tamper.unpackData(canonical);

        // Compare decoded to original
        expect(decoded.length).toBe(originalItems.length);

        // Verify GUIDs match
        decoded.forEach((item, i) => {
          expect(item.guid).toBe(originalItems[i].guid);
        });
      });
    });
  });

  describe("Roundtrip: Encode then Decode", () => {
    datasets.forEach((datasetName) => {
      it(`roundtrips ${datasetName}.json correctly`, async () => {
        const originalItems = await loadDataset(datasetName);
        const config = await loadConfig();

        // Encode
        const packSet = encoder.createPackSet();

        config.attrs.forEach((attr: any) => {
          packSet.addAttribute({
            attrName: attr.attr_name,
            possibilities: attr.possibilities,
            maxChoices: attr.max_choices,
          });
        });

        const maxGuid = originalItems[originalItems.length - 1].guid;
        packSet.pack(originalItems, {
          guidAttr: "guid",
          maxGuid,
          numItems: originalItems.length,
        });

        const packed = packSet.toPlainObject();

        // Decode
        const decoded = tamper.unpackData(packed);

        // Verify roundtrip
        expect(decoded.length).toBe(originalItems.length);

        decoded.forEach((item, i) => {
          expect(item.guid).toBe(originalItems[i].guid);

          // Verify all attributes match
          config.attrs.forEach((attr: any) => {
            const attrName = attr.attr_name;
            if (originalItems[i][attrName] !== undefined) {
              // Handle both single values and arrays
              const original = originalItems[i][attrName];
              const decodedVal = item[attrName];

              // Normalize to strings for comparison (decoder returns strings)
              const normalizeValue = (val: any) => {
                if (val === null || val === undefined) return null;
                if (Array.isArray(val)) {
                  return val.map(v => String(v)).sort();
                }
                return String(val);
              };

              // Unwrap single-element arrays for comparison with non-array originals
              const decodedNormalized = Array.isArray(decodedVal) && decodedVal.length === 1 && !Array.isArray(original)
                ? decodedVal[0]
                : decodedVal;

              if (Array.isArray(original)) {
                expect(Array.isArray(decodedNormalized) || Array.isArray(decodedVal)).toBe(true);
                expect(normalizeValue(decodedVal)).toEqual(normalizeValue(original));
              } else {
                expect(normalizeValue(decodedNormalized)).toBe(normalizeValue(original));
              }
            }
          });
        });
      });
    });
  });

  describe("Specific Dataset Characteristics", () => {
    it("handles small.json (basic functionality)", async () => {
      const items = await loadDataset("small");
      expect(items.length).toBeLessThan(10);
    });

    it("handles sparse.json (wide GUID gaps)", async () => {
      const items = await loadDataset("sparse");
      const guids = items.map((item: any) => item.guid);
      const maxGuid = Math.max(...guids);
      const avgGap = maxGuid / items.length;

      // Sparse data should have large average gap
      expect(avgGap).toBeGreaterThan(10);
    });

    it("handles run.json (longer dataset)", async () => {
      const items = await loadDataset("run");
      expect(items.length).toBeGreaterThan(10);
    });

    it("handles large.json (larger dataset)", async () => {
      const items = await loadDataset("large");
      expect(items.length).toBeGreaterThan(5);
    });
  });
});
