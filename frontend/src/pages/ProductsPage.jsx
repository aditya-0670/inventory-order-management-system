import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle, Eye, Pencil, Plus, Search, Trash2, XCircle } from "lucide-react";

import { getApiErrorMessage } from "../api/client";
import Button from "../components/common/Button.jsx";
import ErrorState from "../components/common/ErrorState.jsx";
import Input from "../components/common/Input.jsx";
import Loader from "../components/common/Loader.jsx";
import StatusBadge from "../components/common/StatusBadge.jsx";
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

function getStockBadge(product) {
  const quantity = Number(product.quantity_in_stock);

  if (quantity <= 0) {
    return { label: "Out of Stock", tone: "danger", icon: XCircle };
  }

  if (quantity <= 5) {
    return { label: "Low Stock", tone: "warning", icon: AlertTriangle };
  }

  return { label: "In Stock", tone: "success", icon: CheckCircle };
}

export default function ProductsPage() {
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { showToast } = useToast();
  const { data: products = [], isLoading, isError, error, refetch } = useProducts();
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
  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) =>
      [product.name, product.sku].some((value) => String(value || "").toLowerCase().includes(query)),
    );
  }, [products, searchTerm]);

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
          <p>Manage inventory items, SKUs, pricing, and stock levels.</p>
        </div>
        <a className="button button-secondary" href="#product-form">
          <Plus aria-hidden="true" size={16} strokeWidth={2.3} />
          Add Product
        </a>
      </div>

      <section className="surface" id="product-form">
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
          <span className="section-meta">{products.length === 1 ? "1 product" : `${products.length} products`}</span>
        </div>
        <div className="table-toolbar">
          <label className="search-field" htmlFor="products-search">
            <Search aria-hidden="true" size={16} strokeWidth={2.3} />
            <span className="sr-only">Search products</span>
            <input
              id="products-search"
              className="input"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by product name or SKU"
              type="search"
              value={searchTerm}
            />
          </label>
          <Button type="button" variant="ghost" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
        {isLoading ? <Loader label="Loading products..." /> : null}
        {isError ? <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} /> : null}
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
                key: "stock_status",
                header: "Status",
                render: (product) => {
                  const badge = getStockBadge(product);
                  return <StatusBadge tone={badge.tone} icon={badge.icon}>{badge.label}</StatusBadge>;
                },
              },
              {
                key: "actions",
                header: "Actions",
                render: (product) => (
                  <div className="row-actions">
                    <Link className="button button-ghost" to={`/products/${product.id}`}>
                      <Eye aria-hidden="true" size={16} strokeWidth={2.3} />
                      View
                    </Link>
                    <Button variant="secondary" icon={Pencil} onClick={() => setEditingProduct(product)}>
                      Edit
                    </Button>
                    <Button variant="danger" icon={Trash2} onClick={() => handleDelete(product)}>
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={filteredProducts}
            emptyMessage={searchTerm ? "No products match your search" : "No products yet. Add your first product to start tracking inventory."}
          />
        ) : null}
      </section>
    </div>
  );
}
