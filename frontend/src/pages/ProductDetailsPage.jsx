import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, DollarSign, PackageCheck, Save, Trash2, XCircle } from "lucide-react";

import { getApiErrorMessage } from "../api/client";
import Button from "../components/common/Button.jsx";
import Input from "../components/common/Input.jsx";
import Loader from "../components/common/Loader.jsx";
import StatusBadge from "../components/common/StatusBadge.jsx";
import SkuInput from "../components/products/SkuInput.jsx";
import { useToast } from "../components/common/Toast.jsx";
import { useDeleteProduct, useProduct, useUpdateProduct } from "../hooks/useProducts";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";
import { productSchema } from "../utils/validators";

const defaultValues = {
  name: "",
  sku: "",
  price: "",
  quantity_in_stock: "",
};

export default function ProductDetailsPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: product, isLoading, isError, error } = useProduct(productId);
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
    if (product) {
      reset({
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity_in_stock: product.quantity_in_stock,
      });
    }
  }, [product, reset]);

  async function onSubmit(values) {
    try {
      await updateProduct.mutateAsync({ productId: product.id, payload: values });
      showToast("Product updated");
    } catch (mutationError) {
      showToast(getApiErrorMessage(mutationError), "error");
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${product.name}?`)) {
      return;
    }

    try {
      await deleteProduct.mutateAsync(product.id);
      showToast("Product deleted");
      navigate("/products");
    } catch (mutationError) {
      showToast(getApiErrorMessage(mutationError), "error");
    }
  }

  if (isLoading) {
    return <Loader label="Loading product details..." />;
  }

  if (isError) {
    return <p className="notice error">{getApiErrorMessage(error)}</p>;
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <Link className="text-link" to="/products">
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.3} />
            Back to products
          </Link>
          <h1>{product.name}</h1>
          <p>{product.sku}</p>
        </div>
        <Button variant="danger" icon={Trash2} onClick={handleDelete} disabled={deleteProduct.isPending}>
          Delete product
        </Button>
      </div>

      <section className="metric-grid product-detail-metrics">
        <article className="metric metric-blue">
          <div className="metric-icon" aria-hidden="true">
            <DollarSign size={21} strokeWidth={2.3} />
          </div>
          <span>Price</span>
          <strong>{formatCurrency(product.price)}</strong>
        </article>
        <article className="metric metric-teal">
          <div className="metric-icon" aria-hidden="true">
            <PackageCheck size={21} strokeWidth={2.3} />
          </div>
          <span>Stock</span>
          <strong>{product.quantity_in_stock}</strong>
        </article>
        <article className="metric metric-amber">
          <div className="metric-icon" aria-hidden="true">
            {product.is_active ? <CheckCircle size={21} strokeWidth={2.3} /> : <XCircle size={21} strokeWidth={2.3} />}
          </div>
          <span>Status</span>
          <strong>
            <StatusBadge tone={product.is_active ? "success" : "neutral"} icon={product.is_active ? CheckCircle : XCircle}>
              {product.is_active ? "Active" : "Inactive"}
            </StatusBadge>
          </strong>
        </article>
      </section>

      <section className="surface detail-grid">
        <div>
          <div className="section-header">
            <h2>Product Details</h2>
          </div>
          <dl className="details-list">
            <div>
              <dt>ID</dt>
              <dd>{product.id}</dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>{product.name}</dd>
            </div>
            <div>
              <dt>SKU</dt>
              <dd>{product.sku}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDate(product.created_at)}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDate(product.updated_at)}</dd>
            </div>
          </dl>
        </div>

        <div>
          <div className="section-header">
            <h2>Update Product</h2>
          </div>
          <form className="form-grid detail-form product-form-grid" onSubmit={handleSubmit(onSubmit)}>
            <Input label="Name" id="product-detail-name" error={errors.name?.message} {...register("name")} />
            <SkuInput
              control={control}
              currentProductId={product.id}
              currentSku={product.sku}
              productName={watchedName}
            />
            <Input label="Price" id="product-detail-price" type="number" step="0.01" error={errors.price?.message} {...register("price")} />
            <Input
              label="Quantity"
              id="product-detail-quantity"
              type="number"
              step="1"
              error={errors.quantity_in_stock?.message}
              {...register("quantity_in_stock")}
            />
            <div className="form-actions">
              <Button type="submit" icon={Save} disabled={isSubmitting || updateProduct.isPending}>
                Update product
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
