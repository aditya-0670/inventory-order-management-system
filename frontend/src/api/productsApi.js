import apiClient from "./client";

export const productsApi = {
  list: () => apiClient.get("/products").then((response) => response.data),
  get: (productId) => apiClient.get(`/products/${productId}`).then((response) => response.data),
  getSkuSuggestions: (productName, limit = 5) =>
    apiClient
      .get("/products/sku-suggestions", { params: { name: productName, limit } })
      .then((response) => response.data),
  checkSkuAvailability: (sku, excludeProductId) =>
    apiClient
      .get("/products/sku-availability", {
        params: {
          sku,
          ...(excludeProductId ? { exclude_product_id: excludeProductId } : {}),
        },
      })
      .then((response) => response.data),
  create: (payload) => apiClient.post("/products", payload).then((response) => response.data),
  update: (productId, payload) => apiClient.put(`/products/${productId}`, payload).then((response) => response.data),
  remove: (productId) => apiClient.delete(`/products/${productId}`).then((response) => response.data),
};
