class ProductBuilder:
    def __init__(self):
        self.payload = {
            "name": "Laptop",
            "sku": "LAPTOP-001",
            "price": "999.99",
            "quantity_in_stock": 10,
        }

    def with_sku(self, sku: str) -> "ProductBuilder":
        self.payload["sku"] = sku
        return self

    def with_name(self, name: str) -> "ProductBuilder":
        self.payload["name"] = name
        return self

    def with_price(self, price: str) -> "ProductBuilder":
        self.payload["price"] = price
        return self

    def with_quantity(self, quantity: int) -> "ProductBuilder":
        self.payload["quantity_in_stock"] = quantity
        return self

    def build(self) -> dict[str, object]:
        return dict(self.payload)
