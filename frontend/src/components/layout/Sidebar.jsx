import { NavLink } from "react-router-dom";
import { BarChart3, ClipboardList, Package, Users } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/products", label: "Products", icon: Package },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/orders", label: "Orders", icon: ClipboardList },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <strong className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Package size={20} strokeWidth={2.4} />
        </span>
        <span>Inventory</span>
      </strong>
      <nav aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to}>
              <Icon aria-hidden="true" size={18} strokeWidth={2.25} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
