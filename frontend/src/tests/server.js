import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const API_BASE_URL = "http://localhost:8000/api/v1";

export const mockProducts = [
  {
    id: 1,
    name: "Laptop",
    sku: "LAPTOP-001",
    price: "999.99",
    quantity_in_stock: 3,
    is_active: true,
    created_at: "2026-05-31T10:00:00Z",
    updated_at: "2026-05-31T10:00:00Z",
  },
  {
    id: 2,
    name: "Keyboard",
    sku: "KEY-001",
    price: "49.99",
    quantity_in_stock: 10,
    is_active: true,
    created_at: "2026-05-31T10:00:00Z",
    updated_at: "2026-05-31T10:00:00Z",
  },
];

export const mockCustomers = [
  {
    id: 1,
    full_name: "Avery Johnson",
    email: "avery@example.com",
    phone_number: "+12025550143",
    created_at: "2026-05-31T10:00:00Z",
    updated_at: "2026-05-31T10:00:00Z",
  },
];

export const mockOrders = [
  {
    id: 1,
    customer_id: 1,
    total_amount: "999.99",
    status: "PLACED",
    created_at: "2026-05-31T10:00:00Z",
    updated_at: "2026-05-31T10:00:00Z",
    items: [
      {
        id: 1,
        product_id: 1,
        quantity: 1,
        unit_price: "999.99",
        line_total: "999.99",
      },
    ],
  },
];

export const defaultHandlers = [
  http.get(`${API_BASE_URL}/dashboard/summary`, () =>
    HttpResponse.json({
      total_products: 2,
      total_customers: 1,
      total_orders: 1,
      low_stock_count: 1,
      low_stock_products: [
        {
          id: 1,
          name: "Laptop",
          sku: "LAPTOP-001",
          quantity_in_stock: 3,
        },
      ],
    }),
  ),
  http.get(`${API_BASE_URL}/products`, () => HttpResponse.json(mockProducts)),
  http.get(`${API_BASE_URL}/products/sku-suggestions`, ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get("name") || "";
    const limit = Number(url.searchParams.get("limit") || "5");
    const baseSku = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    const existingSkus = new Set(mockProducts.map((product) => product.sku));
    const suggestions = [];
    let suffix = 1;

    while (suggestions.length < limit && suffix < 50) {
      const sku = `${baseSku}-${String(suffix).padStart(3, "0")}`;
      if (!existingSkus.has(sku)) {
        suggestions.push({
          sku,
          available: true,
          reason: "Name-based sequential suggestion",
        });
      }
      suffix += 1;
    }

    return HttpResponse.json({ base_sku: baseSku, suggestions });
  }),
  http.get(`${API_BASE_URL}/products/sku-availability`, ({ request }) => {
    const url = new URL(request.url);
    const sku = String(url.searchParams.get("sku") || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    const excludeProductId = Number(url.searchParams.get("exclude_product_id") || 0);

    return HttpResponse.json({
      sku,
      available: !mockProducts.some((product) => product.sku === sku && product.id !== excludeProductId),
    });
  }),
  http.get(`${API_BASE_URL}/products/:productId`, ({ params }) => {
    const product = mockProducts.find((item) => item.id === Number(params.productId));

    if (!product) {
      return HttpResponse.json(
        {
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          },
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(product);
  }),
  http.post(`${API_BASE_URL}/products`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        id: 3,
        ...body,
        price: String(body.price),
        quantity_in_stock: Number(body.quantity_in_stock),
        is_active: true,
        created_at: "2026-05-31T10:00:00Z",
        updated_at: "2026-05-31T10:00:00Z",
      },
      { status: 201 },
    );
  }),
  http.put(`${API_BASE_URL}/products/:productId`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockProducts[0],
      id: Number(params.productId),
      ...body,
    });
  }),
  http.delete(`${API_BASE_URL}/products/:productId`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${API_BASE_URL}/customers`, () => HttpResponse.json(mockCustomers)),
  http.get(`${API_BASE_URL}/customers/:customerId`, ({ params }) => {
    const customer = mockCustomers.find((item) => item.id === Number(params.customerId));

    if (!customer) {
      return HttpResponse.json(
        {
          error: {
            code: "CUSTOMER_NOT_FOUND",
            message: "Customer not found",
          },
        },
        { status: 404 },
      );
    }

    return HttpResponse.json(customer);
  }),
  http.post(`${API_BASE_URL}/customers`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        id: 2,
        ...body,
        created_at: "2026-05-31T10:00:00Z",
        updated_at: "2026-05-31T10:00:00Z",
      },
      { status: 201 },
    );
  }),
  http.put(`${API_BASE_URL}/customers/:customerId`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockCustomers[0],
      id: Number(params.customerId),
      ...body,
      updated_at: "2026-05-31T10:30:00Z",
    });
  }),
  http.delete(`${API_BASE_URL}/customers/:customerId`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${API_BASE_URL}/orders`, () => HttpResponse.json(mockOrders)),
  http.get(`${API_BASE_URL}/orders/:orderId`, () => HttpResponse.json(mockOrders[0])),
  http.post(`${API_BASE_URL}/orders`, async ({ request }) => {
    const body = await request.json();
    const product = mockProducts.find((item) => item.id === Number(body.items[0].product_id));
    const quantity = Number(body.items[0].quantity);
    const total = Number(product.price) * quantity;
    return HttpResponse.json(
      {
        id: 2,
        customer_id: Number(body.customer_id),
        total_amount: total.toFixed(2),
        status: "PLACED",
        created_at: "2026-05-31T10:00:00Z",
        updated_at: "2026-05-31T10:00:00Z",
        items: [
          {
            id: 2,
            product_id: product.id,
            quantity,
            unit_price: product.price,
            line_total: total.toFixed(2),
          },
        ],
      },
      { status: 201 },
    );
  }),
  http.delete(`${API_BASE_URL}/orders/:orderId`, () =>
    HttpResponse.json({
      ...mockOrders[0],
      status: "CANCELLED",
    }),
  ),
];

export const server = setupServer(...defaultHandlers);
