export function formatPrice(price: number): string {
  return `US$${price.toLocaleString("en-US")}`;
}

export function formatMonthlyPayment(payment: number): string {
  return `Desde ${formatPrice(payment)}/mes`;
}
