import { CheckoutClient } from "./checkout-client";

export default function CheckoutPage({
  searchParams,
}: {
  searchParams: { paymentError?: string };
}) {
  return <CheckoutClient paymentError={searchParams.paymentError} />;
}
