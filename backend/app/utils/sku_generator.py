import re

SKU_PATTERN = re.compile(r"^[A-Z0-9]+(-[A-Z0-9]+)*$")
MIN_SKU_LENGTH = 3
MAX_SKU_LENGTH = 50
SEQUENTIAL_SUFFIX_LENGTH = 4


def normalize_sku_base(product_name: str) -> str:
    normalized = re.sub(r"[^A-Z0-9]+", "-", product_name.strip().upper())
    normalized = re.sub(r"-+", "-", normalized).strip("-")

    if not normalized:
        raise ValueError("Product name must contain letters or numbers for SKU generation.")

    return normalized


def _trim_base_for_suffix(base_sku: str) -> str:
    max_base_length = MAX_SKU_LENGTH - SEQUENTIAL_SUFFIX_LENGTH
    if len(base_sku) <= max_base_length:
        return base_sku

    trimmed = base_sku[:max_base_length].strip("-")
    if not trimmed:
        raise ValueError("Product name must contain letters or numbers for SKU generation.")
    return trimmed


def generate_sequential_skus(product_name: str, limit: int = 5) -> list[str]:
    base_sku = _trim_base_for_suffix(normalize_sku_base(product_name))
    return [f"{base_sku}-{index:03d}" for index in range(1, limit + 1)]


def normalize_manual_sku(sku: str) -> str:
    return normalize_sku_base(sku)


def is_valid_sku_format(sku: str) -> bool:
    return (
        MIN_SKU_LENGTH <= len(sku) <= MAX_SKU_LENGTH
        and SKU_PATTERN.fullmatch(sku) is not None
    )
