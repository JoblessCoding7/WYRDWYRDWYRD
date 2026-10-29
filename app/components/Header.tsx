import {useAside} from '~/components/Aside';
import {useCart} from '~/lib/cart';

/** Fixed header: only the cart badge (the Shopify menu was hidden on desktop). */
export function Header() {
  return (
    <header className="header">
      <nav className="header-ctas" role="navigation">
        <CartBadge />
      </nav>
    </header>
  );
}

function CartBadge() {
  const {open} = useAside();
  const {totalQuantity} = useCart();

  return (
    <a
      href="/cart"
      className="cart-badge"
      onClick={(e) => {
        e.preventDefault();
        open('cart');
      }}
    >
      Cart <span>[{totalQuantity}]</span>
    </a>
  );
}
