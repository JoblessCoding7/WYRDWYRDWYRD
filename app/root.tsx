import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import favicon from '~/assets/favicon.svg';

import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import entryStyles from '~/styles/entry.css?url';
import klaviyoStyles from '~/styles/klaviyo.css?url';
import headerStyles from '~/styles/header.css?url';
import cartStyles from '~/styles/cart.css?url';
import footerStyles from '~/styles/footer.css?url';


import kt2AlbumStyles from '~/styles/kt2album.css?url';

import {PageLayout} from './components/PageLayout';

export function links() {
  return [
    {rel: 'preconnect', href: 'https://img.yzcdn.cn'},
    {
      rel: 'preload',
      href: '/fonts/zalando-sans-expanded.ttf',
      as: 'font',
      type: 'font/ttf',
      crossOrigin: 'anonymous',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
}

export function Layout({children}: {children?: React.ReactNode}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <link rel="stylesheet" href={entryStyles}></link>
        <link rel="stylesheet" href={klaviyoStyles}></link>
        <link rel="stylesheet" href={headerStyles}></link>
        <link rel="stylesheet" href={kt2AlbumStyles}></link>
        <link rel="stylesheet" href={cartStyles}></link>
        <link rel="stylesheet" href={footerStyles}></link>
        <Meta />
        <Links />
        <script
          async
          type="text/javascript"
          src="https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=SjaanP"
        ></script>
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <PageLayout>
      <Outlet />
    </PageLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="route-error">
      <h1>Oops</h1>
      <h2>{errorStatus}</h2>
      {errorMessage && (
        <fieldset>
          <pre>{errorMessage}</pre>
        </fieldset>
      )}
    </div>
  );
}
