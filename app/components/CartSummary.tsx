import type {CartLayout} from '~/components/CartMain';
import {useCart} from '~/lib/cart';

export function CartSummary({layout}: {layout: CartLayout}) {
  const {subtotalLabel, checkout, checkoutState} = useCart();
  const className = layout === 'page' ? 'cart-summary-page' : 'cart-summary-aside';

  return (
    <div aria-labelledby="cart-summary" className={className}>
      <dl className="cart-subtotal">
        <dt>Subtotal</dt>
        <dd>{subtotalLabel}</dd>
      </dl>
      <div>
        {checkoutState === 'error' ? (
          <p role="alert">Checkout is unavailable right now — please try again.</p>
        ) : null}
        {/* An <a href> keeps the original checkout link styling; it posts to /api/checkout. */}
        <a
          href="/api/checkout"
          target="_self"
          aria-disabled={checkoutState === 'pending'}
          onClick={(event) => {
            event.preventDefault();
            void checkout();
          }}
        >
          <p>{checkoutState === 'pending' ? 'Opening checkout…' : 'Continue to Checkout'}</p>
        </a>
        <br />
      </div>
    </div>
  );
}
