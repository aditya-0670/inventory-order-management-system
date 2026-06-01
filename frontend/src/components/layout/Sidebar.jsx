import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <strong className="brand">Inventory</strong>
      <nav aria-label="Main navigation">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/products">Products</NavLink>
        <NavLink to="/customers">Customers</NavLink>
        <NavLink to="/orders">Orders</NavLink>
      </nav>
    </aside>
  );
}
