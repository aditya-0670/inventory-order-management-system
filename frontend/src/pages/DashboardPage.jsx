import Loader from "../components/common/Loader.jsx";
import Table from "../components/common/Table.jsx";
import { getApiErrorMessage } from "../api/client";
import { useDashboard } from "../hooks/useDashboard";

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboard();

  if (isLoading) {
    return <Loader label="Loading dashboard..." />;
  }

  if (isError) {
    return <p className="notice error">{getApiErrorMessage(error)}</p>;
  }

  const summaryCards = [
    { label: "Total products", value: data?.total_products ?? 0, tone: "teal" },
    { label: "Total customers", value: data?.total_customers ?? 0, tone: "blue" },
    { label: "Total orders", value: data?.total_orders ?? 0, tone: "amber" },
    { label: "Low stock", value: data?.low_stock_count ?? 0, tone: "red" },
  ];

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Current inventory and order activity.</p>
        </div>
      </div>

      <section className="metric-grid">
        {summaryCards.map((card) => (
          <article className={`metric metric-${card.tone}`} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="surface">
        <div className="section-header">
          <h2>Low Stock Products</h2>
        </div>
        <Table
          columns={[
            { key: "name", header: "Product" },
            { key: "sku", header: "SKU" },
            { key: "quantity_in_stock", header: "Stock" },
          ]}
          rows={data?.low_stock_products ?? []}
          emptyMessage="No products are below the stock threshold"
        />
      </section>
    </div>
  );
}
