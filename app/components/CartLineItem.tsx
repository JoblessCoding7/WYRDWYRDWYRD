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
  const {setQuantity, remove} = useCart();
  const {productId, quantity} = line;

  return (
    <div className="cart-line-quantity">
      <div className="cart-qty-stepper">
        <button
          type="button"
          className="cart-qty-btn"
          aria-label="Decrease quantity"
          disabled={quantity <= 1}
          onClick={() => setQuantity(productId, quantity - 1)}
        >
          &#8722;
        </button>
        <span className="cart-qty-count">{quantity}</span>
        <button
          type="button"
          className="cart-qty-btn"
          aria-label="Increase quantity"
          onClick={() => setQuantity(productId, quantity + 1)}
        >
          &#43;
        </button>
      </div>
      <button type="submit" onClick={() => remove(productId)}>
        Remove
      </button>
    </div>
  );
}
