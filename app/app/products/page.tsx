import { ProductsScreen } from "@/components/products/products";

export default function Page() {
  return <ProductsScreen />;
}

// Authenticated, client-rendered screen: opt out of instant-navigation validation.
export const instant = false;
