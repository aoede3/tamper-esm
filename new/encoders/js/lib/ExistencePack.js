import Pack from './Pack.js';
import Bitpusher from './Bitpusher.js';

export default class ExistencePack extends Pack {
  constructor() {
    super('existence', ['existence'], 1);
    this.encoding = 'existence';
    this.lastGuid = 0;
    this.runCounter = 0;
    this.bitpusher = new Bitpusher();
    this.outputBuffers = [];
  }

  initializePack() {}

  encode(guid) {
    let guidDiff = guid - this.lastGuid;

    if (this.bitpusher.isEmpty() && !this.output && guid > 0) {
      guidDiff += 1;
    }

    if (guidDiff === 1 || guid === 0) {
      this.bitpusher.push(1);
      this.runCounter += 1;
    } else if (guidDiff <= 0) {
      throw new Error(`Error: data was not sorted by GUID (got ${this.lastGuid}, then ${guid})!`);
    } else if (guidDiff > 40) {
      this.dumpKeep(this.bitpusher, this.runCounter);

      this.outputBuffers.push(this.controlCode('skip', guidDiff - 1));

      this.bitpusher.clear();
      this.bitpusher.push(1);
      this.runCounter = 1;
    } else {
      if (this.runCounter > 40) {
        this.dumpKeep(this.bitpusher, this.runCounter);
        this.bitpusher.clear();
        this.runCounter = 0;
      }

      this.bitpusher.pushMany(0, guidDiff - 1);
      this.bitpusher.push(1);
      this.runCounter = 1;
    }

    this.lastGuid = guid;
  }

  finalizePack() {
    this.dumpKeep(this.bitpusher, this.runCounter);
    this.buffer = Buffer.concat(this.outputBuffers);
  }

  toPlainObject() {
    return {
      attr_name: 'existence',
      display_name: '',
      max_choices: 0,
      possibilities: null,
      filter_type: '',
      display_type: '',
      encoding: this.encoding,
      pack: this.encodedBitset(),
      bit_window_width: 0,
      item_window_width: 0,
      max_guid: this.maxGuid ?? 0
    };
  }

  dumpKeep(bitpusher, runLen) {
    if (runLen >= 40) {
      const length = bitpusher.length - runLen;
      this.dumpKeep(bitpusher.slice(0, length), 0);
      this.outputBuffers.push(this.controlCode('run', runLen));
    } else if (bitpusher.length > 0) {
      this.outputBuffers.push(this.controlCode('keep', bitpusher.length));
      this.outputBuffers.push(bitpusher.getBuffer());
    }
  }

  controlCode(cmd, offset = 0) {
    let buffer;

    switch (cmd) {
      case 'keep': {
        const bytesToKeep = Math.floor(offset / 8);
        const remainingBits = offset % 8;

        buffer = Buffer.alloc(6);
        buffer.writeUInt8(ExistencePack.KEEP, 0);
        buffer.writeUInt32BE(bytesToKeep, 1);
        buffer.writeUInt8(remainingBits, 5);
        break;
      }
      case 'skip':
        buffer = Buffer.alloc(5);
        buffer.writeUInt8(ExistencePack.SKIP, 0);
        buffer.writeUInt32BE(offset, 1);
        break;
      case 'run':
        buffer = Buffer.alloc(5);
        buffer.writeUInt8(ExistencePack.RUN, 0);
        buffer.writeUInt32BE(offset, 1);
        break;
      default:
        throw new Error(`Unknown control command: ${cmd}!`);
    }

    return buffer;
  }
}

ExistencePack.KEEP = 0x00;
ExistencePack.SKIP = 0x01;
ExistencePack.RUN = 0x02;
