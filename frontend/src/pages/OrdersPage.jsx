import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle, ClipboardList, Eye, Plus, Search, Trash2, XCircle } from "lucide-react";

import { getApiErrorMessage } from "../api/client";
import Button from "../components/common/Button.jsx";
import ErrorState from "../components/common/ErrorState.jsx";
import Loader from "../components/common/Loader.jsx";
import StatusBadge from "../components/common/StatusBadge.jsx";
import Table from "../components/common/Table.jsx";
import { useToast } from "../components/common/Toast.jsx";
import { useCustomers } from "../hooks/useCustomers";
import { useCancelOrder, useCreateOrder, useOrders } from "../hooks/useOrders";
import { useProducts } from "../hooks/useProducts";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";
import { orderSchema } from "../utils/validators";

const duplicateProductMessage = "Each product can only be added once. Update the quantity instead.";
const allProductsAddedMessage = "All available products have already been added. Update quantities instead.";

const defaultValues = {
  customer_id: "",
  items: [{ product_id: "", quantity: 1 }],
};

function selectedProductIds(items) {
  return (items ?? [])
    .map((item) => item.product_id)
    .filter(Boolean)
    .map(String);
}

function hasDuplicateProducts(items) {
  const selected = selectedProductIds(items);
  return new Set(selected).size !== selected.length;
}

function formatOrderSuccessMessage(order) {
  const orderLabel = order?.id ? `Order #${order.id}` : "Order";

  if (order?.total_amount === undefined || order?.total_amount === null || order.total_amount === "") {
    return `${orderLabel} placed successfully.`;
  }

  const numericTotal = Number(order.total_amount);
  if (!Number.isFinite(numericTotal)) {
    return `${orderLabel} placed successfully.`;
  }

  const formattedTotal = formatCurrency(order.total_amount);
  return `${orderLabel} placed successfully. Total amount: ${formattedTotal}.`;
}

function getOrderStatusBadge(status) {
  if (status === "CANCELLED") {
    return { tone: "neutral", icon: XCircle };
  }

  return { tone: "success", icon: CheckCircle };
}

export default function OrdersPage() {
  const [createdOrder, setCreatedOrder] = useState(null);
  const [orderFormMessage, setOrderFormMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { showToast } = useToast();
  const { data: orders = [], isLoading: ordersLoading, isError: ordersErrored, error: ordersError, refetch: refetchOrders } = useOrders();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const createOrder = useCreateOrder();
  const cancelOrder = useCancelOrder();
  const {
    register,
    control,
    getValues,
    setError,
    clearErrors,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const selectedIds = selectedProductIds(watchedItems);
  const selectedUniqueProductCount = new Set(selectedIds).size;
  const allProductsSelected = products.length > 0 && selectedUniqueProductCount >= products.length;
  const productsById = useMemo(
    () => new Map(products.map((product) => [Number(product.id), product])),
    [products],
  );
  const estimatedTotal = (watchedItems ?? []).reduce((sum, item) => {
    const product = productsById.get(Number(item.product_id));
    const quantity = Number(item.quantity || 0);
    return sum + Number(product?.price ?? 0) * quantity;
  }, 0);
  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return orders;
    }

    return orders.filter((order) =>
      [`#${order.id}`, order.id, order.customer_id, order.status, order.total_amount].some((value) =>
        String(value || "").toLowerCase().includes(query),
      ),
    );
  }, [orders, searchTerm]);
  const orderItemsErrorMessage = errors.items?.message || errors.items?.root?.message;

  async function onSubmit(values) {
    if (hasDuplicateProducts(values.items) || hasDuplicateProducts(getValues("items"))) {
      setOrderFormMessage("");
      setError("items", { type: "manual", message: duplicateProductMessage });
      return;
    }

    try {
      const order = await createOrder.mutateAsync(values);
      setCreatedOrder(order);
      setOrderFormMessage("");
      clearErrors("items");
      showToast(`Order #${order.id} placed`);
      reset(defaultValues);
    } catch (mutationError) {
      showToast(getApiErrorMessage(mutationError), "error");
    }
  }

  function handleAddProduct() {
    if (allProductsSelected) {
      setOrderFormMessage(allProductsAddedMessage);
      return;
    }

    setOrderFormMessage("");
    clearErrors("items");
    append({ product_id: "", quantity: 1 });
  }

  async function handleCancel(order) {
    if (!window.confirm(`Cancel order #${order.id}?`)) {
      return;
    }

    try {
      await cancelOrder.mutateAsync(order.id);
      showToast(`Order #${order.id} cancelled`);
    } catch (mutationError) {
      showToast(getApiErrorMessage(mutationError), "error");
    }
  }

  const formDisabled = customersLoading || productsLoading || createOrder.isPending;

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p>Create orders, review totals, and cancel when needed.</p>
        </div>
        <a className="button button-secondary" href="#order-form">
          <Plus aria-hidden="true" size={16} strokeWidth={2.3} />
          Create Order
        </a>
      </div>

      <section className="surface" id="order-form">
        <div className="section-header">
          <h2>Create Order</h2>
          <div className="total-pill" aria-label={`Estimated subtotal ${formatCurrency(estimatedTotal)}`}>
            <span>Estimated subtotal</span>
            <strong>{formatCurrency(estimatedTotal)}</strong>
          </div>
        </div>
        {customersLoading || productsLoading ? <Loader label="Loading order form data..." /> : null}
        <form className="order-form" onSubmit={handleSubmit(onSubmit)}>
          <label className="field" htmlFor="order-customer">
            <span className="field-label">Customer</span>
            <select id="order-customer" className={errors.customer_id ? "input input-error" : "input"} disabled={formDisabled} {...register("customer_id")}>
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name} ({customer.email})
                </option>
              ))}
            </select>
            {errors.customer_id ? <span className="field-error">{errors.customer_id.message}</span> : null}
          </label>

          <div className="line-items">
            {fields.map((field, index) => {
              const product = productsById.get(Number(watchedItems?.[index]?.product_id));
              const currentProductId = String(watchedItems?.[index]?.product_id || "");
              return (
                <div className="line-item" key={field.id}>
                  <label className="field" htmlFor={`order-product-${field.id}`}>
                    <span className="field-label">Product</span>
                    <select
                      id={`order-product-${field.id}`}
                      className={errors.items?.[index]?.product_id ? "input input-error" : "input"}
                      disabled={formDisabled}
                      {...register(`items.${index}.product_id`)}
                    >
                      <option value="">Select product</option>
                      {products.map((item) => {
                        const optionValue = String(item.id);
                        const isSelectedInAnotherRow = (watchedItems ?? []).some(
                          (watchedItem, watchedIndex) => watchedIndex !== index && String(watchedItem.product_id || "") === optionValue,
                        );
                        const isDisabled = isSelectedInAnotherRow && currentProductId !== optionValue;
                        return (
                          <option key={item.id} value={item.id} disabled={isDisabled}>
                            {item.name} - {item.sku} ({item.quantity_in_stock} in stock)
                            {isDisabled ? " (already selected)" : ""}
                          </option>
                        );
                      })}
                    </select>
                    {errors.items?.[index]?.product_id ? <span className="field-error">{errors.items[index].product_id.message}</span> : null}
                  </label>

                  <label className="field" htmlFor={`order-quantity-${field.id}`}>
                    <span className="field-label">Quantity</span>
                    <input
                      id={`order-quantity-${field.id}`}
                      className={errors.items?.[index]?.quantity ? "input input-error" : "input"}
                      type="number"
                      min="1"
                      disabled={formDisabled}
                      {...register(`items.${index}.quantity`)}
                    />
                    {errors.items?.[index]?.quantity ? <span className="field-error">{errors.items[index].quantity.message}</span> : null}
                  </label>

                  <div className="line-item-meta">
                    <span>{product ? formatCurrency(product.price) : "No product"}</span>
                    <Button variant="ghost" onClick={() => remove(index)} disabled={fields.length === 1 || formDisabled}>
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {orderItemsErrorMessage ? <p className="notice error">{orderItemsErrorMessage}</p> : null}
          {orderFormMessage ? <p className="notice error">{orderFormMessage}</p> : null}
          {allProductsSelected ? (
            <p className="notice notice-inline">
              <AlertTriangle aria-hidden="true" size={16} strokeWidth={2.3} />
              <span>{allProductsAddedMessage}</span>
            </p>
          ) : null}

          <div className="form-actions">
            <Button type="button" variant="secondary" icon={Plus} onClick={handleAddProduct} disabled={formDisabled || allProductsSelected}>
              Add product
            </Button>
            <Button type="submit" icon={ClipboardList} disabled={formDisabled || isSubmitting}>
              Place order
            </Button>
          </div>
        </form>
        {createdOrder ? (
          <p className="notice success">
            {formatOrderSuccessMessage(createdOrder)}
          </p>
        ) : null}
      </section>

      <section className="surface">
        <div className="section-header">
          <h2>Order List</h2>
          <span className="section-meta">{orders.length === 1 ? "1 order" : `${orders.length} orders`}</span>
        </div>
        <div className="table-toolbar">
          <label className="search-field" htmlFor="orders-search">
            <Search aria-hidden="true" size={16} strokeWidth={2.3} />
            <span className="sr-only">Search orders</span>
            <input
              id="orders-search"
              className="input"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by order, customer, status, or total"
              type="search"
              value={searchTerm}
            />
          </label>
          <Button type="button" variant="ghost" onClick={() => refetchOrders()}>
            Refresh
          </Button>
        </div>
        {ordersLoading ? <Loader label="Loading orders..." /> : null}
        {ordersErrored ? <ErrorState message={getApiErrorMessage(ordersError)} onRetry={() => refetchOrders()} /> : null}
        {!ordersLoading && !ordersErrored ? (
          <Table
            columns={[
              { key: "id", header: "Order" },
              { key: "customer_id", header: "Customer ID" },
              { key: "total_amount", header: "Total", render: (order) => formatCurrency(order.total_amount) },
              {
                key: "status",
                header: "Status",
                render: (order) => {
                  const badge = getOrderStatusBadge(order.status);
                  return <StatusBadge tone={badge.tone} icon={badge.icon}>{order.status}</StatusBadge>;
                },
              },
              { key: "created_at", header: "Created", render: (order) => formatDate(order.created_at) },
              {
                key: "actions",
                header: "Actions",
                render: (order) => (
                  <div className="row-actions">
                    <Link className="button button-secondary" to={`/orders/${order.id}`}>
                      <Eye aria-hidden="true" size={16} strokeWidth={2.3} />
                      View
                    </Link>
                    <Button variant="danger" icon={Trash2} disabled={order.status === "CANCELLED"} onClick={() => handleCancel(order)}>
                      Cancel
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={filteredOrders}
            emptyMessage={searchTerm ? "No orders match your search" : "No orders yet. Create your first order."}
          />
        ) : null}
      </section>
    </div>
  );
}
