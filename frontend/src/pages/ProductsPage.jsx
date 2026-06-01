import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { getApiErrorMessage } from "../api/client";
import Button from "../components/common/Button.jsx";
import Input from "../components/common/Input.jsx";
import Loader from "../components/common/Loader.jsx";
import Table from "../components/common/Table.jsx";
import SkuInput from "../components/products/SkuInput.jsx";
import { useToast } from "../components/common/Toast.jsx";
import { useCreateProduct, useDeleteProduct, useProducts, useUpdateProduct } from "../hooks/useProducts";
import { formatCurrency } from "../utils/formatCurrency";
import { productSchema } from "../utils/validators";

const defaultValues = {
  name: "",
  sku: "",
  price: "",
  quantity_in_stock: "",
};

export default function ProductsPage() {
  const [editingProduct, setEditingProduct] = useState(null);
  const { showToast } = useToast();
  const { data: products = [], isLoading, isError, error } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues,
  });
  const watchedName = watch("name");

  useEffect(() => {
    if (editingProduct) {
      reset({
        name: editingProduct.name,
        sku: editingProduct.sku,
        price: editingProduct.price,
        quantity_in_stock: editingProduct.quantity_in_stock,
      });
    }
  }, [editingProduct, reset]);

  function clearForm() {
    setEditingProduct(null);
    reset(defaultValues);
  }

  async function onSubmit(values) {
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ productId: editingProduct.id, payload: values });
        showToast("Product updated");
      } else {
        await createProduct.mutateAsync(values);
        showToast("Product created");
      }
      clearForm();
    } catch (mutationError) {
      showToast(getApiErrorMessage(mutationError), "error");
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete ${product.name}?`)) {
      return;
    }

    try {
      await deleteProduct.mutateAsync(product.id);
      showToast("Product deleted");
    } catch (mutationError) {
      showToast(getApiErrorMessage(mutationError), "error");
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Create, update, and retire inventory items.</p>
        </div>
      </div>

      <section className="surface">
        <div className="section-header">
          <h2>{editingProduct ? "Update Product" : "Add Product"}</h2>
        </div>
        <form className="form-grid product-form-grid" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Name" id="product-name" error={errors.name?.message} {...register("name")} />
          <SkuInput
            control={control}
            currentProductId={editingProduct?.id}
            currentSku={editingProduct?.sku}
            productName={watchedName}
          />
          <Input label="Price" id="product-price" type="number" step="0.01" error={errors.price?.message} {...register("price")} />
          <Input
            label="Quantity"
            id="product-quantity"
            type="number"
            step="1"
            error={errors.quantity_in_stock?.message}
            {...register("quantity_in_stock")}
          />
          <div className="form-actions">
            <Button type="submit" disabled={isSubmitting || createProduct.isPending || updateProduct.isPending}>
              {editingProduct ? "Update product" : "Add product"}
            </Button>
            {editingProduct ? (
              <Button variant="secondary" onClick={clearForm}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="surface">
        <div className="section-header">
          <h2>Product List</h2>
        </div>
        {isLoading ? <Loader label="Loading products..." /> : null}
        {isError ? <p className="notice error">{getApiErrorMessage(error)}</p> : null}
        {!isLoading && !isError ? (
          <Table
            columns={[
              {
                key: "name",
                header: "Name",
                render: (product) => (
                  <Link className="text-link" to={`/products/${product.id}`}>
                    {product.name}
                  </Link>
                ),
              },
              { key: "sku", header: "SKU" },
              { key: "price", header: "Price", render: (product) => formatCurrency(product.price) },
              { key: "quantity_in_stock", header: "Stock" },
              {
                key: "actions",
                header: "Actions",
                render: (product) => (
                  <div className="row-actions">
                    <Link className="button button-ghost" to={`/products/${product.id}`}>
                      View
                    </Link>
                    <Button variant="secondary" onClick={() => setEditingProduct(product)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(product)}>
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={products}
            emptyMessage="No products yet"
          />
        ) : null}
      </section>
    </div>
  );
}
