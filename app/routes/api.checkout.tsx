import type {Route} from './+types/api.checkout';
import {
  CommerceConfigurationError,
  ProductUnavailableError,
  getCommerceProvider,
} from '~/lib/commerce/index.server';
import {parseCheckoutRequest} from '~/lib/checkout';

/**
 * POST { lineItems: [{ productId, quantity }] } → { checkoutUrl, provider }.
 * Only ids and quantities are accepted; price comes from the provider.
 */
export async function action({request}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return Response.json({error: 'Method not allowed.'}, {status: 405});
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({error: 'Checkout request must be valid JSON.'}, {status: 400});
  }

  const checkout = parseCheckoutRequest(body);
  if (!checkout) {
    return Response.json({error: 'Checkout items are invalid or unsupported.'}, {status: 400});
  }

  try {
    return Response.json(await getCommerceProvider().createCheckout(checkout.lineItems));
  } catch (error) {
    if (error instanceof ProductUnavailableError) {
      return Response.json({error: error.message}, {status: 409});
    }
    if (error instanceof CommerceConfigurationError) {
      console.error('[checkout] Configuration error', error.message);
      return Response.json({error: 'Checkout is not configured.'}, {status: 503});
    }
    console.error('[checkout] Could not start checkout', error);
    return Response.json({error: 'Checkout could not be started.'}, {status: 502});
  }
}

export async function loader() {
  return Response.json({error: 'Use POST.'}, {status: 405});
}
