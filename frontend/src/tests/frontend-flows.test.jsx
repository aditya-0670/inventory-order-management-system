import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { API_BASE_URL, server } from "./server";
import { renderApp } from "./testUtils.jsx";

describe("frontend flows", () => {
  async function fillCustomerBaseFields(user, { fullName = "Casey Smith", email = "casey@example.com" } = {}) {
    await user.type(screen.getByLabelText(/full name/i), fullName);
    await user.type(screen.getByLabelText(/email/i), email);
  }

  it("dashboard renders summary cards", async () => {
    renderApp("/dashboard");

    expect(await screen.findByText("Total products")).toBeInTheDocument();
    expect(screen.getByText("Total customers")).toBeInTheDocument();
    expect(screen.getByText("Total orders")).toBeInTheDocument();
    expect(screen.getByText("Low stock")).toBeInTheDocument();
    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("LAPTOP-001")).toBeInTheDocument();
  });

  it("main navigation renders core sections", async () => {
    renderApp("/dashboard");

    const navigation = screen.getByRole("navigation", { name: /main navigation/i });

    expect(within(navigation).getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: /products/i })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: /customers/i })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: /orders/i })).toBeInTheDocument();
  });

  it("products page renders product list", async () => {
    renderApp("/products");

    expect(await screen.findByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Keyboard")).toBeInTheDocument();
    expect(screen.getByText("LAPTOP-001")).toBeInTheDocument();
  });

  it("products page shows stock status badges", async () => {
    renderApp("/products");

    expect(await screen.findByText("Low Stock")).toBeInTheDocument();
    expect(screen.getByText("In Stock")).toBeInTheDocument();
  });

  it("products page shows an empty state when no records exist", async () => {
    server.use(http.get(`${API_BASE_URL}/products`, () => HttpResponse.json([])));

    renderApp("/products");

    expect(await screen.findByText("No products yet. Add your first product to start tracking inventory.")).toBeInTheDocument();
  });

  it("product detail page loads and updates a product", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    await user.click(await screen.findByRole("link", { name: "Laptop" }));

    expect(await screen.findByRole("heading", { name: "Laptop" })).toBeInTheDocument();
    expect(screen.getAllByText("LAPTOP-001")).toHaveLength(2);
    expect(screen.getByText("$999.99")).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/quantity/i));
    await user.type(screen.getByLabelText(/quantity/i), "6");
    await user.click(screen.getByRole("button", { name: /update product/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("Product updated");
  });

  it("edit product form opens with existing SKU without showing a duplicate SKU message", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    await screen.findByText("Laptop");
    await user.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);

    expect(screen.getByRole("heading", { name: "Update Product" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^sku$/i)).toHaveValue("LAPTOP-001");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });
    expect(screen.queryByText("SKU already exists")).not.toBeInTheDocument();
  });

  it("editing only product quantity succeeds without a duplicate SKU warning", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    await screen.findByText("Laptop");
    await user.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);
    await user.clear(screen.getByLabelText(/quantity/i));
    await user.type(screen.getByLabelText(/quantity/i), "20");
    await user.click(screen.getByRole("button", { name: /update product/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("Product updated");
    expect(screen.queryByText("SKU already exists")).not.toBeInTheDocument();
  });

  it("SKU availability check in edit mode excludes the current product id", async () => {
    const user = userEvent.setup();
    let requestedSku;
    let requestedExcludeProductId;
    server.use(
      http.get(`${API_BASE_URL}/products/sku-availability`, ({ request }) => {
        const url = new URL(request.url);
        requestedSku = url.searchParams.get("sku");
        requestedExcludeProductId = url.searchParams.get("exclude_product_id");
        return HttpResponse.json({ sku: requestedSku, available: false });
      }),
    );
    renderApp("/products");

    await screen.findByText("Laptop");
    await user.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);
    await user.clear(screen.getByLabelText(/^sku$/i));
    await user.type(screen.getByLabelText(/^sku$/i), "key-001");

    expect(await screen.findByText("SKU already exists")).toBeInTheDocument();
    expect(requestedSku).toBe("KEY-001");
    expect(requestedExcludeProductId).toBe("1");
  });

  it("changing an edited product SKU to another product's SKU shows a duplicate warning", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    await screen.findByText("Laptop");
    await user.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);
    await user.clear(screen.getByLabelText(/^sku$/i));
    await user.type(screen.getByLabelText(/^sku$/i), "key-001");

    expect(await screen.findByText("SKU already exists")).toBeInTheDocument();
  });

  it("product form validates required fields", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    await user.click(screen.getByRole("button", { name: /add product/i }));

    expect(await screen.findByText("Product name is required")).toBeInTheDocument();
    expect(screen.getByText("SKU is required")).toBeInTheDocument();
  });

  it("product form requests SKU suggestions after product name entry", async () => {
    const user = userEvent.setup();
    let requestedName;
    let requestedLimit;
    server.use(
      http.get(`${API_BASE_URL}/products/sku-suggestions`, ({ request }) => {
        const url = new URL(request.url);
        requestedName = url.searchParams.get("name");
        requestedLimit = url.searchParams.get("limit");
        return HttpResponse.json({
          base_sku: "WIRELESS-MOUSE",
          suggestions: [
            {
              sku: "WIRELESS-MOUSE-001",
              available: true,
              reason: "Name-based sequential suggestion",
            },
          ],
        });
      }),
    );
    renderApp("/products");

    await user.type(screen.getByLabelText(/name/i), "Wireless Mouse");

    expect(await screen.findByRole("button", { name: "WIRELESS-MOUSE-001" })).toBeInTheDocument();
    expect(requestedName).toBe("Wireless Mouse");
    expect(requestedLimit).toBe("2");
  });

  it("only renders the first two SKU suggestions even if API returns more", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_BASE_URL}/products/sku-suggestions`, () =>
        HttpResponse.json({
          base_sku: "IPHONE-16",
          suggestions: [
            { sku: "IPHONE-16-001", available: true, reason: "Name-based sequential suggestion" },
            { sku: "IPHONE-16-002", available: true, reason: "Name-based sequential suggestion" },
            { sku: "IPHONE-16-003", available: true, reason: "Name-based sequential suggestion" },
            { sku: "IPHONE-16-004", available: true, reason: "Name-based sequential suggestion" },
            { sku: "IPHONE-16-005", available: true, reason: "Name-based sequential suggestion" },
          ],
        }),
      ),
    );
    renderApp("/products");

    await user.type(screen.getByLabelText(/name/i), "Iphone 16");

    expect(await screen.findByRole("button", { name: "IPHONE-16-001" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "IPHONE-16-002" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "IPHONE-16-003" })).not.toBeInTheDocument();
  });

  it("SKU suggestions render as clickable buttons and fill SKU input", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    await user.type(screen.getByLabelText(/name/i), "Wireless Mouse");
    await user.click(await screen.findByRole("button", { name: "WIRELESS-MOUSE-001" }));

    expect(screen.getByLabelText(/^sku$/i)).toHaveValue("WIRELESS-MOUSE-001");
  });

  it("renders suggestions below the SKU input inside the stable SKU field container", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    const skuInput = screen.getByLabelText(/^sku$/i);
    const skuField = skuInput.closest(".sku-field");
    expect(skuField).toBeInTheDocument();
    expect(skuField.querySelector(".sku-input-wrapper input")).toBe(skuInput);

    await user.type(screen.getByLabelText(/name/i), "Wireless Mouse");

    const suggestionsContainer = await within(skuField).findByLabelText("SKU suggestions");
    expect(suggestionsContainer).toHaveClass("sku-suggestions");
    expect(within(suggestionsContainer).getByRole("button", { name: "WIRELESS-MOUSE-001" })).toBeInTheDocument();
  });

  it("clicking a SKU suggestion fills the input and hides suggestions", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    await user.type(screen.getByLabelText(/name/i), "Wireless Mouse");
    await user.click(await screen.findByRole("button", { name: "WIRELESS-MOUSE-001" }));

    expect(screen.getByLabelText(/^sku$/i)).toHaveValue("WIRELESS-MOUSE-001");
    await waitFor(() => {
      expect(screen.queryByLabelText("SKU suggestions")).not.toBeInTheDocument();
    });
  });

  it("manually typing in SKU input does not hide current suggestions", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    await user.type(screen.getByLabelText(/name/i), "Wireless Mouse");
    expect(await screen.findByRole("button", { name: "WIRELESS-MOUSE-001" })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^sku$/i), "custom-sku-001");

    expect(screen.getByLabelText(/^sku$/i)).toHaveValue("CUSTOM-SKU-001");
    expect(screen.getByRole("button", { name: "WIRELESS-MOUSE-001" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "WIRELESS-MOUSE-002" })).toBeInTheDocument();
  });

  it("clearing product name hides SKU suggestions", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, "Wireless Mouse");
    expect(await screen.findByRole("button", { name: "WIRELESS-MOUSE-001" })).toBeInTheDocument();
    await user.clear(nameInput);

    await waitFor(() => {
      expect(screen.queryByLabelText("SKU suggestions")).not.toBeInTheDocument();
    });
  });

  it("successful product creation clears and hides SKU suggestions", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    await user.type(screen.getByLabelText(/name/i), "Wireless Mouse");
    expect(await screen.findByRole("button", { name: "WIRELESS-MOUSE-001" })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^sku$/i), "wireless-mouse-custom");
    await user.type(screen.getByLabelText(/price/i), "49.99");
    await user.type(screen.getByLabelText(/quantity/i), "12");
    await user.click(screen.getByRole("button", { name: /add product/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("Product created");
    await waitFor(() => {
      expect(screen.queryByLabelText("SKU suggestions")).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText(/^sku$/i)).toHaveValue("");
  });

  it("SKU suggestion buttons do not submit the product form", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    await user.type(screen.getByLabelText(/name/i), "Wireless Mouse");
    const suggestion = await screen.findByRole("button", { name: "WIRELESS-MOUSE-001" });

    expect(suggestion).toHaveAttribute("type", "button");
    await user.click(suggestion);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("manual SKU typing converts to uppercase", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    await user.type(screen.getByLabelText(/^sku$/i), "custom sku 001");

    expect(screen.getByLabelText(/^sku$/i)).toHaveValue("CUSTOM-SKU-001");
  });

  it("manual SKU availability check shows available status", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    await user.type(screen.getByLabelText(/^sku$/i), "unique-sku-001");

    expect(await screen.findByText("SKU available")).toBeInTheDocument();
  });

  it("existing manual SKU shows already exists status", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    await user.type(screen.getByLabelText(/^sku$/i), "laptop-001");

    expect(await screen.findByText("SKU already exists")).toBeInTheDocument();
  });

  it("product create payload sends selected SKU suggestion", async () => {
    const user = userEvent.setup();
    let submittedBody;
    server.use(
      http.post(`${API_BASE_URL}/products`, async ({ request }) => {
        submittedBody = await request.json();
        return HttpResponse.json(
          {
            id: 3,
            ...submittedBody,
            price: String(submittedBody.price),
            quantity_in_stock: Number(submittedBody.quantity_in_stock),
            is_active: true,
            created_at: "2026-05-31T10:00:00Z",
            updated_at: "2026-05-31T10:00:00Z",
          },
          { status: 201 },
        );
      }),
    );
    renderApp("/products");

    await user.type(screen.getByLabelText(/name/i), "Wireless Mouse");
    await user.click(await screen.findByRole("button", { name: "WIRELESS-MOUSE-001" }));
    await user.type(screen.getByLabelText(/price/i), "49.99");
    await user.type(screen.getByLabelText(/quantity/i), "12");
    await user.click(screen.getByRole("button", { name: /add product/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("Product created");
    expect(submittedBody.sku).toBe("WIRELESS-MOUSE-001");
  });

  it("customer form validates invalid email", async () => {
    const user = userEvent.setup();
    renderApp("/customers");

    await fillCustomerBaseFields(user, { email: "not-an-email" });
    await user.selectOptions(screen.getByLabelText(/country\/region code/i), "IN");
    await user.type(screen.getByLabelText(/phone number/i), "9876543210");
    await user.click(screen.getByRole("button", { name: /add customer/i }));

    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
  });

  it("PhoneNumberInput renders country selector and phone input", async () => {
    renderApp("/customers");

    expect(await screen.findByLabelText(/country\/region code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /India \(IN\) \+91/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Seychelles \(SC\) \+248/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Belize \(BZ\) \+501/i })).toBeInTheDocument();
  });

  it("default country is selected from browser locale", async () => {
    const originalLanguage = window.navigator.language;
    const originalLanguages = window.navigator.languages;
    Object.defineProperty(window.navigator, "language", { value: "en-IN", configurable: true });
    Object.defineProperty(window.navigator, "languages", { value: ["en-IN"], configurable: true });

    renderApp("/customers");

    expect(await screen.findByLabelText(/country\/region code/i)).toHaveValue("IN");

    Object.defineProperty(window.navigator, "language", { value: originalLanguage, configurable: true });
    Object.defineProperty(window.navigator, "languages", { value: originalLanguages, configurable: true });
  });

  it("selecting India and entering a national number submits E.164 without requiring plus", async () => {
    const user = userEvent.setup();
    let submittedBody;
    server.use(
      http.post(`${API_BASE_URL}/customers`, async ({ request }) => {
        submittedBody = await request.json();
        return HttpResponse.json(
          {
            id: 3,
            ...submittedBody,
            is_active: true,
            created_at: "2026-05-31T10:00:00Z",
            updated_at: "2026-05-31T10:00:00Z",
          },
          { status: 201 },
        );
      }),
    );
    renderApp("/customers");

    await fillCustomerBaseFields(user, { email: "india@example.com" });
    await user.selectOptions(screen.getByLabelText(/country\/region code/i), "IN");
    await user.type(screen.getByLabelText(/phone number/i), "9876543210");
    await user.click(screen.getByRole("button", { name: /add customer/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("Customer created");
    expect(submittedBody).toMatchObject({
      full_name: "Casey Smith",
      email: "india@example.com",
      phone_number: "+919876543210",
    });
  });

  it("selecting Seychelles and entering a national number submits E.164", async () => {
    const user = userEvent.setup();
    let submittedBody;
    server.use(
      http.post(`${API_BASE_URL}/customers`, async ({ request }) => {
        submittedBody = await request.json();
        return HttpResponse.json(
          {
            id: 4,
            ...submittedBody,
            is_active: true,
            created_at: "2026-05-31T10:00:00Z",
            updated_at: "2026-05-31T10:00:00Z",
          },
          { status: 201 },
        );
      }),
    );
    renderApp("/customers");

    await fillCustomerBaseFields(user, { email: "seychelles@example.com" });
    await user.selectOptions(screen.getByLabelText(/country\/region code/i), "SC");
    await user.type(screen.getByLabelText(/phone number/i), "2512345");
    await user.click(screen.getByRole("button", { name: /add customer/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("Customer created");
    expect(submittedBody.phone_number).toBe("+2482512345");
  });

  it("empty phone number shows validation error", async () => {
    const user = userEvent.setup();
    renderApp("/customers");

    await fillCustomerBaseFields(user, { email: "empty-phone@example.com" });
    await user.click(screen.getByRole("button", { name: /add customer/i }));

    expect(await screen.findByText("Phone number is required.")).toBeInTheDocument();
  });

  it("alphabetic phone number shows validation error", async () => {
    const user = userEvent.setup();
    renderApp("/customers");

    await fillCustomerBaseFields(user, { email: "letters-phone@example.com" });
    await user.type(screen.getByLabelText(/phone number/i), "abc123");
    await user.click(screen.getByRole("button", { name: /add customer/i }));

    expect(await screen.findByText("Enter a valid phone number for the selected country.")).toBeInTheDocument();
  });

  it("impossible short phone number shows validation error", async () => {
    const user = userEvent.setup();
    renderApp("/customers");

    await fillCustomerBaseFields(user, { email: "short-phone@example.com" });
    await user.selectOptions(screen.getByLabelText(/country\/region code/i), "IN");
    await user.type(screen.getByLabelText(/phone number/i), "12");
    await user.click(screen.getByRole("button", { name: /add customer/i }));

    expect(await screen.findByText("Enter a valid phone number for the selected country.")).toBeInTheDocument();
  });

  it("customer detail page loads a customer by ID", async () => {
    const user = userEvent.setup();
    renderApp("/customers");

    await user.click(await screen.findByRole("link", { name: "Avery Johnson" }));

    expect(await screen.findByRole("heading", { name: "Avery Johnson" })).toBeInTheDocument();
    expect(screen.getAllByText("avery@example.com")).toHaveLength(2);
    expect(screen.getByText("+12025550143")).toBeInTheDocument();
    expect(screen.getByText("Customer Details")).toBeInTheDocument();
  });

  it("customer edit form sends normalized E.164 phone_number", async () => {
    const user = userEvent.setup();
    let submittedBody;
    server.use(
      http.put(`${API_BASE_URL}/customers/:customerId`, async ({ request }) => {
        submittedBody = await request.json();
        return HttpResponse.json({
          id: 1,
          ...submittedBody,
          is_active: true,
          created_at: "2026-05-31T10:00:00Z",
          updated_at: "2026-05-31T10:30:00Z",
        });
      }),
    );
    renderApp("/customers");

    await user.click(await screen.findByRole("link", { name: "Avery Johnson" }));
    await screen.findByRole("heading", { name: "Avery Johnson" });
    await user.selectOptions(screen.getByLabelText(/country\/region code/i), "SC");
    await user.clear(screen.getByLabelText(/phone number/i));
    await user.type(screen.getByLabelText(/phone number/i), "2512345");
    await user.click(screen.getByRole("button", { name: /update customer/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("Customer updated");
    expect(submittedBody.phone_number).toBe("+2482512345");
  });

  it("orders page renders customers and products from mocked APIs", async () => {
    renderApp("/orders");

    expect(await screen.findByRole("option", { name: /avery johnson/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /laptop - laptop-001/i })).toBeInTheDocument();
    expect(screen.getByText("Order List")).toBeInTheDocument();
  });

  async function fillOrderBasics(user) {
    await screen.findByRole("option", { name: /avery johnson/i });
    await screen.findByRole("option", { name: /laptop - laptop-001/i });
    await user.selectOptions(screen.getByLabelText(/customer/i), "1");
  }

  it("order form prevents submission without customer/product", async () => {
    const user = userEvent.setup();
    renderApp("/orders");

    await screen.findByRole("button", { name: /place order/i });
    await user.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByText("Select a customer")).toBeInTheDocument();
    expect(screen.getByText("Select a product")).toBeInTheDocument();
  });

  it("order success message uses backend total amount", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_BASE_URL}/orders`, () =>
        HttpResponse.json(
          {
            id: 4,
            customer_id: 1,
            total_amount: "1012.25",
            status: "PLACED",
            created_at: "2026-05-31T10:00:00Z",
            updated_at: "2026-05-31T10:00:00Z",
            items: [],
          },
          { status: 201 },
        ),
      ),
    );
    renderApp("/orders");

    await fillOrderBasics(user);
    await user.selectOptions(screen.getByLabelText(/^product$/i), "1");
    await user.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByText("Order #4 placed successfully. Total amount: $1,012.25.")).toBeInTheDocument();
  });

  it("order success message omits broken total text when backend total is missing", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_BASE_URL}/orders`, () =>
        HttpResponse.json(
          {
            id: 4,
            customer_id: 1,
            status: "PLACED",
            created_at: "2026-05-31T10:00:00Z",
            updated_at: "2026-05-31T10:00:00Z",
            items: [],
          },
          { status: 201 },
        ),
      ),
    );
    renderApp("/orders");

    await fillOrderBasics(user);
    await user.selectOptions(screen.getByLabelText(/^product$/i), "1");
    await user.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByText("Order #4 placed successfully.")).toBeInTheDocument();
    expect(screen.queryByText(/undefined|NaN/i)).not.toBeInTheDocument();
  });

  it("product selected in row one is disabled in row two but remains enabled in row one", async () => {
    const user = userEvent.setup();
    renderApp("/orders");

    await fillOrderBasics(user);
    await user.selectOptions(screen.getByLabelText(/^product$/i), "1");
    await user.click(screen.getByRole("button", { name: /add product/i }));

    const productSelects = screen.getAllByLabelText(/^product$/i);
    expect(within(productSelects[0]).getByRole("option", { name: /laptop - laptop-001/i })).not.toBeDisabled();
    expect(within(productSelects[1]).getByRole("option", { name: /laptop - laptop-001 .*already selected/i })).toBeDisabled();
    expect(within(productSelects[1]).getByRole("option", { name: /keyboard - key-001/i })).not.toBeDisabled();
  });

  it("blocks duplicate product submission before calling create order API", async () => {
    const user = userEvent.setup();
    let createOrderCalled = false;
    server.use(
      http.post(`${API_BASE_URL}/orders`, () => {
        createOrderCalled = true;
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    renderApp("/orders");

    await fillOrderBasics(user);
    await user.selectOptions(screen.getByLabelText(/^product$/i), "1");
    await user.click(screen.getByRole("button", { name: /add product/i }));
    const productSelects = screen.getAllByLabelText(/^product$/i);
    const disabledDuplicateOption = within(productSelects[1]).getByRole("option", { name: /laptop - laptop-001 .*already selected/i });
    disabledDuplicateOption.disabled = false;
    fireEvent.change(productSelects[1], { target: { value: "1" } });
    expect(productSelects[1]).toHaveValue("1");
    await user.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByText("Each product can only be added once. Update the quantity instead.")).toBeInTheDocument();
    expect(createOrderCalled).toBe(false);
  });

  it("disables add product and shows helper message when all products are already selected", async () => {
    const user = userEvent.setup();
    renderApp("/orders");

    await fillOrderBasics(user);
    await user.selectOptions(screen.getByLabelText(/^product$/i), "1");
    await user.click(screen.getByRole("button", { name: /add product/i }));
    await user.selectOptions(screen.getAllByLabelText(/^product$/i)[1], "2");

    expect(screen.getByRole("button", { name: /add product/i })).toBeDisabled();
    expect(screen.getByText("All available products have already been added. Update quantities instead.")).toBeInTheDocument();
  });

  it("quantity remains editable for an already selected product", async () => {
    const user = userEvent.setup();
    renderApp("/orders");

    await fillOrderBasics(user);
    await user.selectOptions(screen.getByLabelText(/^product$/i), "1");
    const quantityInput = screen.getByLabelText(/quantity/i);
    await user.clear(quantityInput);
    await user.type(quantityInput, "3");

    expect(quantityInput).toHaveValue(3);
    expect(screen.getByText("$2,999.97")).toBeInTheDocument();
  });

  it("API error message is shown for insufficient stock", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_BASE_URL}/orders`, () =>
        HttpResponse.json(
          {
            error: {
              code: "INSUFFICIENT_STOCK",
              message: "Insufficient stock for product LAPTOP-001",
              details: {
                available: 1,
                requested: 5,
              },
            },
          },
          { status: 409 },
        ),
      ),
    );
    renderApp("/orders");

    await screen.findByRole("option", { name: /avery johnson/i });
    await screen.findByRole("option", { name: /laptop - laptop-001/i });
    await user.selectOptions(screen.getByLabelText(/customer/i), "1");
    await user.selectOptions(screen.getByLabelText(/product/i), "1");
    await user.clear(screen.getByLabelText(/quantity/i));
    await user.type(screen.getByLabelText(/quantity/i), "5");
    await user.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Insufficient stock for product LAPTOP-001");
  });

  it("successful create product flow shows success message", async () => {
    const user = userEvent.setup();
    renderApp("/products");

    await user.type(screen.getByLabelText(/name/i), "Monitor");
    await user.type(screen.getByLabelText(/sku/i), "MON-001");
    await user.type(screen.getByLabelText(/price/i), "199.99");
    await user.type(screen.getByLabelText(/quantity/i), "8");
    await user.click(screen.getByRole("button", { name: /add product/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("Product created");
    await waitFor(() => {
      const productRows = screen.getByText("Product List").closest("section");
      expect(within(productRows).getByText("Laptop")).toBeInTheDocument();
    });
  });
});
