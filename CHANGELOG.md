# @aoede/tamper

## 1.0.0

### Major Changes

- Initial release of Tamper ESM encoder/decoder
- Modern TypeScript implementation with full ESM support
- Three encoding strategies: existence packing (RLE), integer packing, and bitmap packing
- Browser and Node.js environments supported
- Byte-for-byte parity with canonical fixtures verified
- Stack overflow fix in decoder for large sparse datasets (iterative vs recursive)
- Comprehensive test suite and example scripts

### Features

- **Encoder**: Environment-agnostic core with Node.js and browser adapters
- **Decoder**: Lightweight client-side decoder for unpacking Tamper data
- **Performance**: 4-30x compression for categorical tabular data
- **Type Safety**: Full TypeScript definitions with exported types
- **Testing**: Decoder and encoder parity verification against canonical fixtures
