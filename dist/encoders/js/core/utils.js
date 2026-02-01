var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// encoders/js/core/utils.ts
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
__name(isPlainObject, "isPlainObject");
function clone(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.slice();
  return Object.assign({}, obj);
}
__name(clone, "clone");
function values(obj) {
  return Object.keys(obj).map((key) => obj[key]);
}
__name(values, "values");
function last(arr) {
  return arr && arr.length ? arr[arr.length - 1] : void 0;
}
__name(last, "last");
function sortBy(obj, iteratee) {
  const entries = Object.keys(obj).map((key) => {
    const value = obj[key];
    return [key, value, iteratee(value, key)];
  });
  entries.sort((a, b) => {
    const av = a[2];
    const bv = b[2];
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });
  return entries.map((entry) => entry[1]);
}
__name(sortBy, "sortBy");
function merge(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    const max = Math.max(target.length, source.length);
    for (let i = 0; i < max; i += 1) {
      if (!(i in source)) continue;
      const sourceVal = source[i];
      const targetVal = target[i];
      if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
        target[i] = merge(targetVal.slice(), sourceVal);
      } else if (isPlainObject(targetVal) && isPlainObject(sourceVal)) {
        target[i] = merge(Object.assign({}, targetVal), sourceVal);
      } else {
        target[i] = sourceVal;
      }
    }
    return target;
  }
  if (isPlainObject(target) && isPlainObject(source)) {
    Object.keys(source).forEach((key) => {
      const sourceVal = source[key];
      const targetVal = target[key];
      if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
        target[key] = merge(targetVal.slice(), sourceVal);
      } else if (isPlainObject(targetVal) && isPlainObject(sourceVal)) {
        target[key] = merge(Object.assign({}, targetVal), sourceVal);
      } else {
        target[key] = sourceVal;
      }
    });
    return target;
  }
  return source;
}
__name(merge, "merge");

export { clone, last, merge, sortBy, values };
//# sourceMappingURL=utils.js.map
//# sourceMappingURL=utils.js.map