import apiClient from "./client";

export const customersApi = {
  list: () => apiClient.get("/customers").then((response) => response.data),
  get: (customerId) => apiClient.get(`/customers/${customerId}`).then((response) => response.data),
  create: (payload) => apiClient.post("/customers", payload).then((response) => response.data),
  update: (customerId, payload) => apiClient.put(`/customers/${customerId}`, payload).then((response) => response.data),
  remove: (customerId) => apiClient.delete(`/customers/${customerId}`).then((response) => response.data),
};
