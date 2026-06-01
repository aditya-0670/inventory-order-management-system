import { useParams } from "react-router-dom";

import { getApiErrorMessage } from "../api/client";
import Button from "../components/common/Button.jsx";
import Loader from "../components/common/Loader.jsx";
import Table from "../components/common/Table.jsx";
import { useToast } from "../components/common/Toast.jsx";
import { useCancelOrder, useOrder } from "../hooks/useOrders";
import { useProducts } from "../hooks/useProducts";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDate } from "../utils/formatDate";

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const { showToast } = useToast();
  const { data: order, isLoading, isError, error } = useOrder(orderId);
  const { data: products = [] } = useProducts();
  const cancelOrder = useCancelOrder();
  const productsById = new Map(products.map((product) => [Number(product.id), product]));

  async function handleCancel() {
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

  if (isLoading) {
    return <Loader label="Loading order details..." />;
  }

  if (isError) {
    return <p className="notice error">{getApiErrorMessage(error)}</p>;
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Order #{order.id}</h1>
          <p>Placed {formatDate(order.created_at)}</p>
        </div>
        <Button variant="danger" disabled={order.status === "CANCELLED"} onClick={handleCancel}>
          Cancel order
        </Button>
      </div>

      <section className="metric-grid">
        <article className="metric metric-blue">
          <span>Customer ID</span>
          <strong>{order.customer_id}</strong>
        </article>
        <article className="metric metric-amber">
          <span>Total</span>
          <strong>{formatCurrency(order.total_amount)}</strong>
        </article>
        <article className="metric metric-teal">
          <span>Status</span>
          <strong>{order.status}</strong>
        </article>
      </section>

      <section className="surface">
        <div className="section-header">
          <h2>Items</h2>
        </div>
        <Table
          columns={[
            {
              key: "product_id",
              header: "Product",
              render: (item) => productsById.get(Number(item.product_id))?.name ?? `Product #${item.product_id}`,
            },
            { key: "quantity", header: "Quantity" },
            { key: "unit_price", header: "Unit price", render: (item) => formatCurrency(item.unit_price) },
            { key: "line_total", header: "Line total", render: (item) => formatCurrency(item.line_total) },
          ]}
          rows={order.items ?? []}
          emptyMessage="No items on this order"
        />
      </section>
    </div>
  );
}
