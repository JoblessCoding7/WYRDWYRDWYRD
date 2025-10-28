/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

interface Env {
  KLAVIYO_PRIVATE_API_KEY: string;
  KLAVIYO_EMAIL_LIST_ID: string;
}

declare module '@shopify/hydrogen' {
  interface AppLoadContext {
    env: Env;
  }
}
