import {Link} from 'react-router';
import {useAside} from '~/components/Aside';
import {CartLineItem} from '~/components/CartLineItem';
import {useCart} from '~/lib/cart';
import {CartSummary} from './CartSummary';

export type CartLayout = 'page' | 'aside';

export function CartMain({layout}: {layout: CartLayout}) {
  const {lines, totalQuantity} = useCart();

  return (
    <div className="cart-main">
      <CartEmpty hidden={lines.length > 0} />
      <div className="cart-details">
        <div aria-labelledby="cart-lines">
          <ul>
            {lines.map((line) => (
              <CartLineItem key={line.productId} line={line} layout={layout} />
            ))}
          </ul>
        </div>
        {totalQuantity > 0 && <CartSummary layout={layout} />}
      </div>
    </div>
  );
}

function CartEmpty({hidden}: {hidden: boolean}) {
  const {close} = useAside();
  return (
    <div hidden={hidden}>
      <br />
      <p>
        Looks like you haven&rsquo;t added anything yet, let&rsquo;s get you
        started!
      </p>
      <br />
      <Link to="/products/album-product" onClick={close} prefetch="viewport">
        Continue shopping →
      </Link>
    </div>
  );
}
