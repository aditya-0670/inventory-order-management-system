import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { customersApi } from "../api/customersApi";

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: customersApi.list,
  });
}

export function useCustomer(customerId) {
  return useQuery({
    queryKey: ["customers", Number(customerId)],
    queryFn: () => customersApi.get(customerId),
    enabled: Boolean(customerId),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, payload }) => customersApi.update(customerId, payload),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers", Number(customer.id)] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customersApi.remove,
    onSuccess: (_data, customerId) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers", Number(customerId)] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
