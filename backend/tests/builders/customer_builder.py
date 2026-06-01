class CustomerBuilder:
    def __init__(self):
        self.payload = {
            "full_name": "Avery Johnson",
            "email": "avery@example.com",
            "phone_number": "+12025550143",
        }

    def with_email(self, email: str) -> "CustomerBuilder":
        self.payload["email"] = email
        return self

    def with_full_name(self, full_name: str) -> "CustomerBuilder":
        self.payload["full_name"] = full_name
        return self

    def with_phone_number(self, phone_number: str) -> "CustomerBuilder":
        self.payload["phone_number"] = phone_number
        return self

    def build(self) -> dict[str, object]:
        return dict(self.payload)
