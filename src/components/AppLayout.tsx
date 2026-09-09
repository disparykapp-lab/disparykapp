import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-brand-bg pb-20">
      <main className="mx-auto max-w-lg px-4 py-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
