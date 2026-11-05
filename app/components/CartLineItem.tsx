import {Link} from 'react-router';
import type {CartLayout} from '~/components/CartMain';
import {useCart, type CartLine} from '~/lib/cart';
import {formatOfferPrice} from '~/lib/product-offer';
import {useAside} from './Aside';

export function CartLineItem({layout, line}: {layout: CartLayout; line: CartLine}) {
  const {close} = useAside();
  const total = Math.round(line.unitPrice * line.quantity * 100) / 100;

  return (
    <li className="cart-line">
      {line.imageUrl && (
        <div className="cart-line-img-wrap">
          <img src={line.imageUrl} alt={line.title} loading="lazy" width={100} height={100} />
        </div>
      )}

      <div
        style={{
          width: '100%',
          height: '125px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div className="product-detail-row">
          <Link
            prefetch="intent"
            to="/products/album-product"
            onClick={() => {
              if (layout === 'aside') close();
            }}
          >
            <p>
              <strong>{line.title}</strong>
            </p>
          </Link>
          <div className="product-price">{formatOfferPrice(total)}</div>
        </div>
        <CartLineQuantity line={line} />
      </div>
    </li>
  );
}

function CartLineQuantity({line}: {line: CartLine}) {
  const {remove} = useCart();

  // One KT2 per order (see maxQuantity in lib/cart): no stepper, just the count.
  return (
    <div className="cart-line-quantity">
      <div className="cart-qty-stepper">
        <span className="cart-qty-count">×{line.quantity}</span>
      </div>
      <button type="submit" onClick={() => remove(line.productId)}>
        Remove
      </button>
    </div>
  );
}
