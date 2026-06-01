import { UserCircle } from "lucide-react";

export default function Navbar() {
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">Operations</span>
        <strong>Inventory & Order Management</strong>
      </div>
      <div className="topbar-profile" aria-label="Demo workspace user">
        <UserCircle aria-hidden="true" size={22} strokeWidth={2.2} />
        <span>Admin</span>
      </div>
    </header>
  );
}
