export function formatPrice(price: number): string {
  return `US$${price.toLocaleString("en-US")}`;
}
