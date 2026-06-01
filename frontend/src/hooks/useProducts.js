import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { productsApi } from "../api/productsApi";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
  });
}

export function useProduct(productId) {
  return useQuery({
    queryKey: ["products", Number(productId)],
    queryFn: () => productsApi.get(productId),
    enabled: Boolean(productId),
  });
}

export function useSkuSuggestions(productName, limit = 5, enabled = true) {
  return useQuery({
    queryKey: ["sku-suggestions", productName, limit],
    queryFn: () => productsApi.getSkuSuggestions(productName, limit),
    enabled: enabled && Boolean(productName?.trim()),
  });
}

export function useSkuAvailability(sku, excludeProductId, enabled = true) {
  return useQuery({
    queryKey: ["sku-availability", sku, excludeProductId ?? null],
    queryFn: () => productsApi.checkSkuAvailability(sku, excludeProductId),
    enabled: enabled && Boolean(sku),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, payload }) => productsApi.update(productId, payload),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", Number(product.id)] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
