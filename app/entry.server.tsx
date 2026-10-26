import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';
import type {EntryContext} from 'react-router';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      'https://cdn.shopify.com',
      'https://idgqpd-gb.myshopify.com',
      'https://static.klaviyo.com',
      'https://static-tracking.klaviyo.com',
      'https://fonts.googleapis.com',
      'https://wyrd.com',
      'https://www.wyrd.com',
    ],
    fontSrc: [
      "'self'",
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdn.shopify.com',
      'https://fast.a.klaviyo.com',
      'https://wyrd.com',
      'https://www.wyrd.com',
    ],
    scriptSrc: [
      "'self'",
      'https://cdn.shopify.com',
      'https://static.klaviyo.com',
      'https://static-tracking.klaviyo.com',
      'https://wyrd.com',
      'https://www.wyrd.com',
      'https://unpkg.com',
      'https://idgqpd-gb.myshopify.com',
    ],
    connectSrc: [
      "'self'",
      'https://monorail-edge.shopifysvc.com',
      'https://cdn.shopify.com',
      'https://idgqpd-gb.myshopify.com',
      'http://localhost:*',
      'ws://localhost:*',
      'ws://127.0.0.1:*',
      'ws://*.tryhydrogen.dev:*',
      'https://static-forms.klaviyo.com',
      'https://fast.a.klaviyo.com',
      'https://a.klaviyo.com',
      'http://a.klaviyo.com',
      'https://api-js.datadome.co',
      'https://a.klaviyo.com/client/profiles',
      'https://9a2355e26bf7.ngrok-free.app ',
      'https://wyrd.com',
      'https://www.wyrd.com',
      'https://api.emailjs.com',
      'https://idgqpd-gb.myshopify.com',
    ],
    frameSrc: ["'self'", 'https://geo.captcha-delivery.com'],
    workerSrc: ["'self'", 'blob:'],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
