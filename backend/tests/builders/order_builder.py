class OrderPayloadBuilder:
    def __init__(self):
        self.payload = {
            "customer_id": 1,
            "items": [
                {
                    "product_id": 1,
                    "quantity": 1,
                }
            ],
        }

    def with_items(self, items: list[dict[str, int]]) -> "OrderPayloadBuilder":
        self.payload["items"] = items
        return self

    def with_customer_id(self, customer_id: int) -> "OrderPayloadBuilder":
        self.payload["customer_id"] = customer_id
        return self

    def with_single_item(self, product_id: int, quantity: int = 1) -> "OrderPayloadBuilder":
        self.payload["items"] = [
            {
                "product_id": product_id,
                "quantity": quantity,
            }
        ]
        return self

    def build(self) -> dict[str, object]:
        return dict(self.payload)
