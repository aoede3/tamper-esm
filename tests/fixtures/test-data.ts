/**
 * Test data generators and helpers for Tamper test suite
 */

export const bitPatterns = {
  allZeros: (length: number) => new Uint8Array(length).fill(0),
  allOnes: (length: number) => new Uint8Array(length).fill(0xff),
  alternating: (length: number) => new Uint8Array(length).fill(0xaa), // 10101010
  sequential: (length: number) =>
    new Uint8Array(length).map((_, i) => i % 256),
};

export function createSequentialGuids(count: number, start = 0) {
  return Array.from({ length: count }, (_, i) => ({ guid: start + i }));
}

export function createSparseGuids(guids: number[]) {
  return guids.map((guid) => ({ guid }));
}

export function createGuidGap(start: number, end: number, gap: number) {
  const result: Array<{ guid: number }> = [];
  for (let i = start; i <= end; i += gap) {
    result.push({ guid: i });
  }
  return result;
}

export function createLargePossibilities(count: number, prefix = "option") {
  return Array.from({ length: count }, (_, i) => `${prefix}_${i}`);
}

export function createTestDataset(count: number, attributes: Record<string, any>) {
  return Array.from({ length: count }, (_, i) => ({
    guid: i,
    ...attributes,
  }));
}

export function createMultiValueDataset(
  count: number,
  attrName: string,
  possibilities: string[],
  valuesPerItem: number,
) {
  return Array.from({ length: count }, (_, i) => ({
    guid: i,
    [attrName]: Array.from(
      { length: valuesPerItem },
      (_, j) => possibilities[(i * valuesPerItem + j) % possibilities.length],
    ),
  }));
}

export const testConfig = {
  smallPossibilities: ["a", "b", "c"],
  mediumPossibilities: ["opt1", "opt2", "opt3", "opt4", "opt5"],
  largePossibilities: createLargePossibilities(100),
  booleanPossibilities: ["true", "false"],
  genderPossibilities: ["male", "female", "other"],
};

/**
 * Helper to create attribute configuration
 */
export function createAttributeConfig(
  attrName: string,
  possibilities: string[],
  maxChoices: number,
) {
  return {
    attrName,
    possibilities,
    maxChoices,
  };
}

/**
 * Creates a basic pack configuration for testing
 */
export function createBasicPackConfig() {
  return {
    attrs: [
      createAttributeConfig("gender", testConfig.genderPossibilities, 1),
      createAttributeConfig("interests", testConfig.mediumPossibilities, 3),
    ],
  };
}
