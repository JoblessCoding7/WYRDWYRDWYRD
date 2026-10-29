/** Missing or invalid provider configuration (env vars, product mapping). */
export class CommerceConfigurationError extends Error {}

/** The requested product/quantity cannot be sold right now. */
export class ProductUnavailableError extends Error {}
