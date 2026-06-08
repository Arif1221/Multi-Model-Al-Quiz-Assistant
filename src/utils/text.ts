export const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const stableId = (prefix: string, seed: string, index: number) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  return `${prefix}-${index + 1}-${Math.abs(hash).toString(36)}`;
};

export const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeWhitespace(value).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
