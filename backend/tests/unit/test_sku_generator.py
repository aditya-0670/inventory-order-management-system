import pytest

from app.utils.sku_generator import (
    generate_sequential_skus,
    is_valid_sku_format,
    normalize_sku_base,
)


def test_normalize_sku_base_from_product_name():
    assert normalize_sku_base("Wireless Mouse") == "WIRELESS-MOUSE"


def test_normalize_sku_base_collapses_extra_spaces():
    assert normalize_sku_base("  wireless   mouse  ") == "WIRELESS-MOUSE"


def test_normalize_sku_base_removes_special_characters():
    assert normalize_sku_base("TV & Speaker Combo!") == "TV-SPEAKER-COMBO"


def test_normalize_sku_base_keeps_digits():
    assert normalize_sku_base("iPhone 15 Pro") == "IPHONE-15-PRO"


def test_generate_sequential_skus_uses_padded_suffixes():
    assert generate_sequential_skus("Wireless Mouse", 3) == [
        "WIRELESS-MOUSE-001",
        "WIRELESS-MOUSE-002",
        "WIRELESS-MOUSE-003",
    ]


def test_generated_skus_follow_valid_format():
    assert all(is_valid_sku_format(sku) for sku in generate_sequential_skus("Wireless Mouse", 3))


def test_empty_or_invalid_name_is_rejected():
    with pytest.raises(ValueError):
        normalize_sku_base(" !!! ")
