function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function clone(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.slice();
  return Object.assign({}, obj);
}

export function values(obj) {
  return Object.keys(obj).map((key) => obj[key]);
}

export function last(arr) {
  return arr && arr.length ? arr[arr.length - 1] : undefined;
}

export function sortBy(obj, iteratee) {
  return Object.keys(obj)
    .sort((a, b) => {
      const av = iteratee(obj[a], a);
      const bv = iteratee(obj[b], b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    })
    .map((key) => obj[key]);
}

export function merge(target, source) {
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
