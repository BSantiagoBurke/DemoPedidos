import type { Metadata } from "next";
import { Checkout } from "@/components/pedidos/Checkout";

export const metadata: Metadata = { title: "Finalizar pedido" };

export default function CheckoutPage() {
  return <Checkout />;
}
