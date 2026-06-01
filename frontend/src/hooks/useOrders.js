import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ordersApi } from "../api/ordersApi";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: ordersApi.list,
  });
}

export function useOrder(orderId) {
  return useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => ordersApi.detail(orderId),
    enabled: Boolean(orderId),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ordersApi.cancel,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", String(order.id)] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
