/**
 * Demonstrates the size difference between Tamper-encoded data and plain JSON.
 *
 * This example shows how Tamper efficiently compresses categorical tabular data
 * through specialized encoding strategies:
 * - Existence encoding (run-length encoding for sparse data)
 * - Integer encoding (bit-packed categorical values)
 * - Bitmap encoding (dense multi-value attributes)
 */

import { createPackSet } from "../encoders/js/index.ts";
import createTamper from "../clients/js/src/tamper.ts";

// Helper to format byte sizes
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Helper to calculate size of JSON string
function getJsonSize(data: unknown): number {
  return new TextEncoder().encode(JSON.stringify(data)).length;
}

// Helper to calculate compression ratio
function getCompressionRatio(original: number, compressed: number): string {
  const ratio = ((1 - compressed / original) * 100).toFixed(1);
  return `${ratio}%`;
}

console.log("=".repeat(70));
console.log("Tamper vs Plain JSON - Size Comparison");
console.log("=".repeat(70));
console.log();

// ============================================================================
// Example 1: Sparse E-commerce Product Analytics
// ============================================================================
console.log("Example 1: Sparse E-commerce Product Analytics");
console.log("-".repeat(70));
console.log("Scenario: 10,000 products, but only 500 have been viewed");
console.log("This demonstrates Tamper's existence encoding (RLE for sparse data)");
console.log();

const productAnalytics = [];

// Generate 500 unique sparse product views across guid range 0-10000
const usedGuids = new Set<number>();
while (productAnalytics.length < 500) {
  const guid = Math.floor(Math.random() * 10000);
  if (usedGuids.has(guid)) continue;
  usedGuids.add(guid);

  const categoryIndex = Math.floor(Math.random() * 5);
  const categories = ["electronics", "clothing", "home", "sports", "books"];
  const deviceIndex = Math.floor(Math.random() * 3);
  const devices = ["mobile", "desktop", "tablet"];

  productAnalytics.push({
    guid,
    category: categories[categoryIndex],
    device: devices[deviceIndex],
    converted: Math.random() > 0.9 ? "yes" : "no",
  });
}

// Sort by guid (required by Tamper)
productAnalytics.sort((a, b) => a.guid - b.guid);

// Create Tamper pack
const tamp1 = createPackSet();
tamp1.addAttribute({
  attrName: "category",
  possibilities: ["electronics", "clothing", "home", "sports", "books"],
  maxChoices: 1,
});
tamp1.addAttribute({
  attrName: "device",
  possibilities: ["mobile", "desktop", "tablet"],
  maxChoices: 1,
});
tamp1.addAttribute({
  attrName: "converted",
  possibilities: ["yes", "no"],
  maxChoices: 1,
});

const maxGuid1 = productAnalytics[productAnalytics.length - 1].guid;
tamp1.pack(productAnalytics, { guidAttr: "guid", maxGuid: maxGuid1, numItems: productAnalytics.length });

const tamperPack1 = tamp1.toPlainObject();
const plainJsonSize1 = getJsonSize(productAnalytics);
const tamperSize1 = getJsonSize(tamperPack1);

console.log(`Plain JSON:    ${formatBytes(plainJsonSize1)}`);
console.log(`Tamper pack:   ${formatBytes(tamperSize1)}`);
console.log(`Compression:   ${getCompressionRatio(plainJsonSize1, tamperSize1)} smaller`);
console.log(`Ratio:         ${(plainJsonSize1 / tamperSize1).toFixed(2)}x`);
console.log();

// Verify decoding works
const decoder1 = createTamper();
const decoded1 = decoder1.unpackData(tamperPack1);
console.log(`✓ Decoded ${decoded1.length} items (original: ${productAnalytics.length})`);
console.log();

// ============================================================================
// Example 2: Dense User Feature Matrix
// ============================================================================
console.log("Example 2: Dense User Feature Matrix");
console.log("-".repeat(70));
console.log("Scenario: 1,000 users with multiple tags/features");
console.log("This demonstrates bitmap encoding for multi-value attributes");
console.log();

const userFeatures = [];
const allTags = ["premium", "verified", "creator", "earlyAdopter", "beta", "moderator"];
const allInterests = ["tech", "sports", "music", "gaming", "art", "science", "cooking", "travel"];

for (let i = 0; i < 1000; i++) {
  const numTags = Math.floor(Math.random() * 3);
  const numInterests = Math.floor(Math.random() * 5) + 1;

  const tags = [];
  for (let j = 0; j < numTags; j++) {
    const tag = allTags[Math.floor(Math.random() * allTags.length)];
    if (!tags.includes(tag)) tags.push(tag);
  }

  const interests = [];
  for (let j = 0; j < numInterests; j++) {
    const interest = allInterests[Math.floor(Math.random() * allInterests.length)];
    if (!interests.includes(interest)) interests.push(interest);
  }

  userFeatures.push({
    guid: i,
    tags: tags.length ? tags : null,
    interests,
    accountType: ["free", "pro", "enterprise"][Math.floor(Math.random() * 3)],
  });
}

const tamp2 = createPackSet();
tamp2.addAttribute({
  attrName: "tags",
  possibilities: allTags,
  maxChoices: 6,
});
tamp2.addAttribute({
  attrName: "interests",
  possibilities: allInterests,
  maxChoices: 8,
});
tamp2.addAttribute({
  attrName: "accountType",
  possibilities: ["free", "pro", "enterprise"],
  maxChoices: 1,
});

tamp2.pack(userFeatures, { guidAttr: "guid", maxGuid: 999, numItems: 1000 });

const tamperPack2 = tamp2.toPlainObject();
const plainJsonSize2 = getJsonSize(userFeatures);
const tamperSize2 = getJsonSize(tamperPack2);

console.log(`Plain JSON:    ${formatBytes(plainJsonSize2)}`);
console.log(`Tamper pack:   ${formatBytes(tamperSize2)}`);
console.log(`Compression:   ${getCompressionRatio(plainJsonSize2, tamperSize2)} smaller`);
console.log(`Ratio:         ${(plainJsonSize2 / tamperSize2).toFixed(2)}x`);
console.log();

const decoder2 = createTamper();
const decoded2 = decoder2.unpackData(tamperPack2);
console.log(`✓ Decoded ${decoded2.length} items (original: ${userFeatures.length})`);
console.log();

// ============================================================================
// Example 3: Time-series Events (Very Sparse, Small Dataset)
// ============================================================================
console.log("Example 3: Time-series Events (Very Sparse, Small Dataset)");
console.log("-".repeat(70));
console.log("Scenario: 100 events across 1 million time slots");
console.log("Even with extreme sparsity, fixed overhead limits gains on small datasets");
console.log();

const timeseriesEvents = [];
const eventTypes = ["click", "view", "purchase", "signup", "error"];
const sources = ["web", "mobile", "api"];

// Generate 100 unique sparse events across 1 million time slots
const usedEventGuids = new Set<number>();
while (timeseriesEvents.length < 100) {
  const guid = Math.floor(Math.random() * 1000000);
  if (usedEventGuids.has(guid)) continue;
  usedEventGuids.add(guid);

  timeseriesEvents.push({
    guid,
    eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
  });
}

timeseriesEvents.sort((a, b) => a.guid - b.guid);

const tamp3 = createPackSet();
tamp3.addAttribute({
  attrName: "eventType",
  possibilities: eventTypes,
  maxChoices: 1,
});
tamp3.addAttribute({
  attrName: "source",
  possibilities: sources,
  maxChoices: 1,
});

const maxGuid3 = timeseriesEvents[timeseriesEvents.length - 1].guid;
tamp3.pack(timeseriesEvents, { guidAttr: "guid", maxGuid: maxGuid3, numItems: timeseriesEvents.length });

const tamperPack3 = tamp3.toPlainObject();
const plainJsonSize3 = getJsonSize(timeseriesEvents);
const tamperSize3 = getJsonSize(tamperPack3);

console.log(`Plain JSON:    ${formatBytes(plainJsonSize3)}`);
console.log(`Tamper pack:   ${formatBytes(tamperSize3)}`);
console.log(`Compression:   ${getCompressionRatio(plainJsonSize3, tamperSize3)} smaller`);
console.log(`Ratio:         ${(plainJsonSize3 / tamperSize3).toFixed(2)}x`);
console.log();

const decoder3 = createTamper();
const decoded3 = decoder3.unpackData(tamperPack3);
console.log(`✓ Decoded ${decoded3.length} items (original: ${timeseriesEvents.length})`);
console.log();

// ============================================================================
// Example 4: Time-series Events (Very Sparse, Scaled Up)
// ============================================================================
console.log("Example 4: Time-series Events (Very Sparse, Scaled Up)");
console.log("-".repeat(70));
console.log("Scenario: 10,000 events across 1 million time slots");
console.log("At scale, extreme sparsity shows Tamper's existence encoding strength");
console.log();

const timeseriesEventsScaled = [];

// Generate 10,000 unique sparse events across 1 million time slots
const usedScaledGuids = new Set<number>();
while (timeseriesEventsScaled.length < 10000) {
  const guid = Math.floor(Math.random() * 1000000);
  if (usedScaledGuids.has(guid)) continue;
  usedScaledGuids.add(guid);

  timeseriesEventsScaled.push({
    guid,
    eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
  });
}

timeseriesEventsScaled.sort((a, b) => a.guid - b.guid);

const tamp4 = createPackSet();
tamp4.addAttribute({
  attrName: "eventType",
  possibilities: eventTypes,
  maxChoices: 1,
});
tamp4.addAttribute({
  attrName: "source",
  possibilities: sources,
  maxChoices: 1,
});

const maxGuid4 = timeseriesEventsScaled[timeseriesEventsScaled.length - 1].guid;
tamp4.pack(timeseriesEventsScaled, { guidAttr: "guid", maxGuid: maxGuid4, numItems: timeseriesEventsScaled.length });

const tamperPack4 = tamp4.toPlainObject();
const plainJsonSize4 = getJsonSize(timeseriesEventsScaled);
const tamperSize4 = getJsonSize(tamperPack4);

console.log(`Plain JSON:    ${formatBytes(plainJsonSize4)}`);
console.log(`Tamper pack:   ${formatBytes(tamperSize4)}`);
console.log(`Compression:   ${getCompressionRatio(plainJsonSize4, tamperSize4)} smaller`);
console.log(`Ratio:         ${(plainJsonSize4 / tamperSize4).toFixed(2)}x`);
console.log();

const decoder4 = createTamper();
const decoded4 = decoder4.unpackData(tamperPack4);
console.log(`✓ Decoded ${decoded4.length} items (original: ${timeseriesEventsScaled.length})`);
console.log();

// ============================================================================
// Summary
// ============================================================================
console.log("=".repeat(70));
console.log("Summary");
console.log("=".repeat(70));

const totalPlainJson = plainJsonSize1 + plainJsonSize2 + plainJsonSize3 + plainJsonSize4;
const totalTamper = tamperSize1 + tamperSize2 + tamperSize3 + tamperSize4;

console.log();
console.log(`Total Plain JSON:  ${formatBytes(totalPlainJson)}`);
console.log(`Total Tamper:      ${formatBytes(totalTamper)}`);
console.log(`Overall savings:   ${getCompressionRatio(totalPlainJson, totalTamper)} smaller`);
console.log(`Overall ratio:     ${(totalPlainJson / totalTamper).toFixed(2)}x`);
console.log();
console.log("Key takeaways:");
console.log("• Sparse data benefits from existence encoding (RLE)");
console.log("• Fixed overhead matters - compression improves with dataset size");
console.log("• Categorical values are efficiently bit-packed");
console.log("• Multi-value attributes use bitmap encoding");
console.log("• Best for tabular, categorical, bulk datasets");
console.log("• Further gains possible with gzip/brotli on top");
console.log();
