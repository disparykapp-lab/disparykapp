import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <main className="mx-auto max-w-lg px-4 pb-8 pt-4">
        <Outlet />
      </main>
    </div>
  );
}
