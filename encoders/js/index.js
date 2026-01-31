import createEncoder from "./core/createEncoder.js";
import nodeEnv from "./env/node.js";

const encoder = createEncoder(nodeEnv);

export const createPackSet = encoder.createPackSet;
export const PackSet = encoder.PackSet;
export const createPack = encoder.createPack;
export const Pack = encoder.Pack;
export const IntegerPack = encoder.IntegerPack;
export const BitmapPack = encoder.BitmapPack;
export const ExistencePack = encoder.ExistencePack;
export const Bitpusher = encoder.Bitpusher;
