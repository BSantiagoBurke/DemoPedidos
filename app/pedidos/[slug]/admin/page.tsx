import type { Metadata } from "next";
import { AdminPanel } from "@/components/pedidos/admin/AdminPanel";

export const metadata: Metadata = { title: "Panel" };

export default function AdminPage() {
  return <AdminPanel />;
}
