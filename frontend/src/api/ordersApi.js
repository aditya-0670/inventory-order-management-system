import apiClient from "./client";

export const ordersApi = {
  list: () => apiClient.get("/orders").then((response) => response.data),
  detail: (orderId) => apiClient.get(`/orders/${orderId}`).then((response) => response.data),
  create: (payload) => apiClient.post("/orders", payload).then((response) => response.data),
  cancel: (orderId) => apiClient.delete(`/orders/${orderId}`).then((response) => response.data),
};
