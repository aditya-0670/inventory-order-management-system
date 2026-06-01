const SKU_PATTERN = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

export function normalizeSkuInput(value) {
  return String(value || "")
    .trimStart()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-");
}

export function normalizeSkuForSubmit(value) {
  return normalizeSkuInput(value).replace(/^-+|-+$/g, "");
}

export function isValidSkuFormat(value) {
  const sku = String(value || "");
  return sku.length >= 3 && sku.length <= 50 && SKU_PATTERN.test(sku);
}
