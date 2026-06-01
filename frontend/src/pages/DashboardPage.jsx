import { AlertTriangle, ClipboardList, Package, Users } from "lucide-react";

import ErrorState from "../components/common/ErrorState.jsx";
import Loader from "../components/common/Loader.jsx";
import SkeletonCard from "../components/common/SkeletonCard.jsx";
import Table from "../components/common/Table.jsx";
import { getApiErrorMessage } from "../api/client";
import { useDashboard } from "../hooks/useDashboard";

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard();

  if (isLoading) {
    return (
      <div className="stack">
        <div className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Current inventory, customer, and order activity.</p>
          </div>
        </div>
        <section className="metric-grid" aria-label="Loading dashboard summary">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </section>
        <Loader label="Loading dashboard..." />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={getApiErrorMessage(error)} onRetry={() => refetch()} />;
  }

  const summaryCards = [
    { label: "Total products", value: data?.total_products ?? 0, tone: "teal", icon: Package, helper: "Active inventory items" },
    { label: "Total customers", value: data?.total_customers ?? 0, tone: "blue", icon: Users, helper: "Customer records available" },
    { label: "Total orders", value: data?.total_orders ?? 0, tone: "amber", icon: ClipboardList, helper: "Orders placed in the system" },
    { label: "Low stock", value: data?.low_stock_count ?? 0, tone: "red", icon: AlertTriangle, helper: "Require restocking soon" },
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
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article className={`metric metric-${card.tone}`} key={card.label}>
              <div className="metric-icon" aria-hidden="true">
                <Icon size={21} strokeWidth={2.3} />
              </div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.helper}</small>
            </article>
          );
        })}
      </section>

      <section className="surface">
        <div className="section-header">
          <h2>Low Stock Products</h2>
          <span className="section-meta">{data?.low_stock_products?.length ?? 0} items</span>
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
