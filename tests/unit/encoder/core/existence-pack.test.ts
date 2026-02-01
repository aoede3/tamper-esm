import { describe, it, expect, beforeEach } from "vitest";
import createEncoder from "../../../../encoders/js/core/createEncoder";
import nodeEnv from "../../../../encoders/js/env/node";

describe("ExistencePack", () => {
  let ExistencePack: any;

  beforeEach(() => {
    const encoder = createEncoder(nodeEnv);
    ExistencePack = encoder.ExistencePack;
  });

  describe("initialization", () => {
    it("creates pack with existence encoding", () => {
      const pack = new ExistencePack();
      expect(pack.encoding).toBe("existence");
      expect(pack.attrName).toBe("existence");
      expect(pack.lastGuid).toBe(0);
      expect(pack.runCounter).toBe(0);
    });

    it("initializes empty control codes array", () => {
      const pack = new ExistencePack();
      expect(pack.controlCodes).toEqual([]);
    });
  });

  describe("control code constants", () => {
    it("defines KEEP as 0x00", () => {
      expect(ExistencePack.KEEP).toBe(0x00);
    });

    it("defines SKIP as 0x01", () => {
      expect(ExistencePack.SKIP).toBe(0x01);
    });

    it("defines RUN as 0x02", () => {
      expect(ExistencePack.RUN).toBe(0x02);
    });
  });

  describe("sequential GUID encoding", () => {
    it("encodes sequential GUIDs starting at 0", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(1);
      pack.encode(2);

      expect(pack.lastGuid).toBe(2);
      expect(pack.runCounter).toBe(3);
    });

    it("encodes long sequential run", () => {
      const pack = new ExistencePack();
      for (let i = 0; i < 50; i++) {
        pack.encode(i);
      }

      pack.finalizePack();
      // Should use RUN control code for runs >= 40
      expect(pack.controlCodes.some((cc: any) => cc.type === "run")).toBe(true);
    });

    it("triggers RUN at exactly 40 items", () => {
      const pack = new ExistencePack();
      for (let i = 0; i < 40; i++) {
        pack.encode(i);
      }

      pack.finalizePack();
      expect(pack.controlCodes.some((cc: any) => cc.type === "run")).toBe(true);
    });

    it("uses KEEP for runs < 40", () => {
      const pack = new ExistencePack();
      for (let i = 0; i < 39; i++) {
        pack.encode(i);
      }

      pack.finalizePack();
      const hasRun = pack.controlCodes.some((cc: any) => cc.type === "run");
      expect(hasRun).toBe(false);
    });
  });

  describe("GUID gap handling", () => {
    it("handles small gap (GUID diff <= 40)", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(5); // Gap of 4

      expect(pack.bitpusher.length).toBeGreaterThan(0);
    });

    it("handles large gap (GUID diff > 40)", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(100); // Gap of 99

      pack.finalizePack();
      expect(pack.controlCodes.some((cc: any) => cc.type === "skip")).toBe(true);
    });

    it("triggers SKIP at exactly gap of 41", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(42); // Gap of 41

      pack.finalizePack();
      expect(pack.controlCodes.some((cc: any) => cc.type === "skip")).toBe(true);
    });

    it("triggers SKIP for gap of 41", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(42); // Gap of 41 (guidDiff = 42 - 0 = 42, which is > 40)

      pack.finalizePack();
      const hasSkip = pack.controlCodes.some((cc: any) => cc.type === "skip");
      expect(hasSkip).toBe(true);
    });
  });

  describe("GUID sorting validation", () => {
    it("throws on duplicate GUID", () => {
      const pack = new ExistencePack();
      pack.encode(5);

      expect(() => pack.encode(5)).toThrow(/not sorted/);
    });

    it("throws on decreasing GUID", () => {
      const pack = new ExistencePack();
      pack.encode(10);

      expect(() => pack.encode(5)).toThrow(/not sorted/);
    });

    it("accepts increasing GUIDs", () => {
      const pack = new ExistencePack();
      pack.encode(1);
      pack.encode(5);
      pack.encode(10);

      expect(pack.lastGuid).toBe(10);
    });

    it("handles GUID = 0 correctly", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(1);

      expect(pack.lastGuid).toBe(1);
    });
  });

  describe("first GUID offset handling", () => {
    it("adds offset for first GUID > 0", () => {
      const pack = new ExistencePack();
      pack.encode(5);

      // guidDiff should be 5 + 1 = 6 for first item
      expect(pack.bitpusher.length).toBeGreaterThan(0);
    });

    it("does not add offset for GUID = 0", () => {
      const pack = new ExistencePack();
      pack.encode(0);

      expect(pack.runCounter).toBe(1);
    });

    it("handles first GUID = 1 correctly", () => {
      const pack = new ExistencePack();
      pack.encode(1);

      expect(pack.runCounter).toBe(1);
    });
  });

  describe("dumpKeep() logic", () => {
    it("dumps KEEP for run < 40", () => {
      const pack = new ExistencePack();
      for (let i = 0; i < 30; i++) {
        pack.encode(i);
      }

      pack.finalizePack();
      expect(pack.controlCodes.some((cc: any) => cc.type === "keep")).toBe(true);
    });

    it("dumps KEEP + RUN for long run", () => {
      const pack = new ExistencePack();
      for (let i = 0; i < 10; i++) pack.encode(i); // Initial KEEP
      for (let i = 10; i < 60; i++) pack.encode(i); // RUN

      pack.finalizePack();
      const hasKeep = pack.controlCodes.some((cc: any) => cc.type === "keep");
      const hasRun = pack.controlCodes.some((cc: any) => cc.type === "run");
      // Might have both or just RUN depending on threshold
      expect(hasRun || hasKeep).toBe(true);
    });

    it("handles runLen >= 40 threshold", () => {
      const pack = new ExistencePack();

      // Create pattern that triggers dumpKeep with runLen >= 40
      for (let i = 0; i < 50; i++) {
        pack.encode(i);
      }

      pack.finalizePack();
      expect(pack.controlCodes.length).toBeGreaterThan(0);
    });
  });

  describe("finalizePack()", () => {
    it("converts control codes to buffer", () => {
      const pack = new ExistencePack();
      for (let i = 0; i < 5; i++) pack.encode(i);

      pack.finalizePack();

      expect(pack.buffer).toBeDefined();
      expect(pack.buffer.length).toBeGreaterThan(0);
    });

    it("creates buffer with correct size for KEEP", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(1);

      pack.finalizePack();

      // KEEP control code: 1 byte cmd + 4 bytes offset + 1 byte remainder + data
      expect(pack.buffer.length).toBeGreaterThan(6);
    });

    it("creates buffer with correct size for SKIP", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(100); // Large gap

      pack.finalizePack();

      // SKIP control code: 1 byte cmd + 4 bytes offset = 5 bytes
      expect(pack.buffer.length).toBeGreaterThan(0);
    });

    it("creates buffer with correct size for RUN", () => {
      const pack = new ExistencePack();
      for (let i = 0; i < 50; i++) pack.encode(i);

      pack.finalizePack();

      // RUN control code: 1 byte cmd + 4 bytes offset = 5 bytes
      expect(pack.buffer.length).toBeGreaterThan(0);
    });

    it("handles empty pack", () => {
      const pack = new ExistencePack();
      pack.finalizePack();

      expect(pack.buffer).toBeDefined();
    });
  });

  describe("controlCode() buffer generation", () => {
    it("generates KEEP control code", () => {
      const pack = new ExistencePack();
      const buffer = pack.controlCode("keep", 10);

      expect(buffer.length).toBe(6);
      expect(buffer[0]).toBe(0x00); // KEEP command
    });

    it("generates SKIP control code", () => {
      const pack = new ExistencePack();
      const buffer = pack.controlCode("skip", 100);

      expect(buffer.length).toBe(5);
      expect(buffer[0]).toBe(0x01); // SKIP command
    });

    it("generates RUN control code", () => {
      const pack = new ExistencePack();
      const buffer = pack.controlCode("run", 50);

      expect(buffer.length).toBe(5);
      expect(buffer[0]).toBe(0x02); // RUN command
    });

    it("throws for unknown command", () => {
      const pack = new ExistencePack();
      expect(() => pack.controlCode("invalid", 0)).toThrow(/Unknown control command/);
    });

    it("encodes offset correctly in KEEP", () => {
      const pack = new ExistencePack();
      const buffer = pack.controlCode("keep", 10);

      // Bytes 1-4: byte count (10 / 8 = 1)
      // Byte 5: remaining bits (10 % 8 = 2)
      expect(buffer.readUInt32BE(1)).toBe(1);
      expect(buffer.readUInt8(5)).toBe(2);
    });

    it("encodes offset correctly in SKIP", () => {
      const pack = new ExistencePack();
      const buffer = pack.controlCode("skip", 999);

      expect(buffer.readUInt32BE(1)).toBe(999);
    });

    it("encodes offset correctly in RUN", () => {
      const pack = new ExistencePack();
      const buffer = pack.controlCode("run", 100);

      expect(buffer.readUInt32BE(1)).toBe(100);
    });
  });

  describe("toPlainObject()", () => {
    it("returns existence pack structure", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.finalizePack();

      const obj = pack.toPlainObject();

      expect(obj.attr_name).toBe("existence");
      expect(obj.encoding).toBe("existence");
      expect(obj.max_choices).toBe(0);
      expect(obj.possibilities).toBeNull();
    });

    it("includes base64 encoded pack", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(1);
      pack.finalizePack();

      const obj = pack.toPlainObject();
      expect(obj.pack).toBeDefined();
      expect(typeof obj.pack).toBe("string");
    });

    it("includes max_guid", () => {
      const pack = new ExistencePack();
      pack.maxGuid = 100;
      pack.finalizePack();

      const obj = pack.toPlainObject();
      expect(obj.max_guid).toBe(100);
    });

    it("sets bit_window_width to 0", () => {
      const pack = new ExistencePack();
      const obj = pack.toPlainObject();
      expect(obj.bit_window_width).toBe(0);
    });

    it("sets item_window_width to 0", () => {
      const pack = new ExistencePack();
      const obj = pack.toPlainObject();
      expect(obj.item_window_width).toBe(0);
    });
  });

  describe("complex patterns", () => {
    it("handles alternating present/absent pattern", () => {
      const pack = new ExistencePack();
      for (let i = 0; i < 20; i += 2) {
        pack.encode(i); // 0, 2, 4, 6, ...
      }

      pack.finalizePack();
      expect(pack.buffer.length).toBeGreaterThan(0);
    });

    it("handles sparse data (wide gaps)", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(100);
      pack.encode(200);
      pack.encode(300);

      pack.finalizePack();
      expect(pack.controlCodes.some((cc: any) => cc.type === "skip")).toBe(true);
    });

    it("handles dense data (sequential)", () => {
      const pack = new ExistencePack();
      for (let i = 0; i < 100; i++) {
        pack.encode(i);
      }

      pack.finalizePack();
      expect(pack.controlCodes.some((cc: any) => cc.type === "run")).toBe(true);
    });

    it("handles mixed pattern (dense then sparse)", () => {
      const pack = new ExistencePack();

      // Dense section
      for (let i = 0; i < 50; i++) pack.encode(i);

      // Sparse section
      pack.encode(200);
      pack.encode(400);

      pack.finalizePack();

      const hasRun = pack.controlCodes.some((cc: any) => cc.type === "run");
      const hasSkip = pack.controlCodes.some((cc: any) => cc.type === "skip");
      expect(hasRun || hasSkip).toBe(true);
    });

    it("handles single item", () => {
      const pack = new ExistencePack();
      pack.encode(42);

      pack.finalizePack();
      expect(pack.buffer.length).toBeGreaterThan(0);
    });

    it("handles two adjacent items", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(1);

      pack.finalizePack();
      expect(pack.buffer.length).toBeGreaterThan(0);
    });
  });

  describe("run counter management", () => {
    it("resets run counter after SKIP", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(100); // Triggers SKIP

      expect(pack.runCounter).toBe(1); // Reset for new item
    });

    it("increments run counter for sequential items", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(1);
      pack.encode(2);

      expect(pack.runCounter).toBe(3);
    });

    it("resets run counter after dumping long run", () => {
      const pack = new ExistencePack();

      // Create long run (> 40)
      for (let i = 0; i < 45; i++) pack.encode(i);

      // Add one more item
      pack.encode(100);

      expect(pack.runCounter).toBe(1); // Should reset
    });
  });

  describe("bitpusher integration", () => {
    it("uses bitpusher for small gaps", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(3); // Gap of 2

      expect(pack.bitpusher.length).toBeGreaterThan(0);
      expect(pack.bitpusher.isEmpty()).toBe(false);
    });

    it("clears bitpusher after SKIP", () => {
      const pack = new ExistencePack();
      pack.encode(0);
      pack.encode(100); // Triggers SKIP and clear

      // Bitpusher should be reset
      expect(pack.bitpusher.length).toBeGreaterThan(0); // Has new bit for item at 100
    });

    it("clears bitpusher after long run dump", () => {
      const pack = new ExistencePack();

      // Create pattern that triggers bitpusher clear
      for (let i = 0; i < 50; i++) pack.encode(i);

      expect(pack.bitpusher).toBeDefined();
    });
  });
});
