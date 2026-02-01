export type JsonObject = Record<string, unknown>;

export type ExistencePack = {
  pack: string;
};

export type AttributePack = {
  encoding: string;
  attr_name: string;
  possibilities: string[];
  pack: string;
  bit_window_width: number;
  item_window_width: number;
};

export type PackData = {
  existence?: ExistencePack;
  attributes?: AttributePack[];
  collection?: JsonObject[];
};
