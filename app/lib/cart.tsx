import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {isCheckoutSession} from '~/lib/checkout';
import {formatOfferPrice} from '~/lib/product-offer';

/**
 * Browser-side cart. It only remembers what the buyer picked; prices shown here
 * are for display — the server re-reads price and stock from the commerce
 * provider at checkout, and the buyer pays on the provider's page.
 */
export type CartLine = {
  productId: string;
  title: string;
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
};

export type CartLineInput = Omit<CartLine, 'quantity'>;

const storageKey = 'wyrd-cart-v1';
/**
 * One KT2 per order. Youzan's pre-filled order page (which would carry the
 * quantity) needs a capability package we don't have, so the buyer lands on
 * the Youzan product page and picks the quantity there; keeping our cart at 1
 * avoids showing a number that doesn't carry over. Raise when that changes.
 */
export const maxQuantity = 1;

type CartContextValue = {
  lines: CartLine[];
  totalQuantity: number;
  subtotalLabel: string;
  add: (line: CartLineInput) => void;
  /** Refresh title/price/image of a line already in the cart (quantity kept). */
  sync: (line: CartLineInput) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  checkout: () => Promise<void>;
  /** Skip the cart: check out this one item right away. */
  buyNow: (line: CartLineInput) => Promise<void>;
  checkoutState: 'idle' | 'pending' | 'error';
};

const CartContext = createContext<CartContextValue | null>(null);

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== 'object' || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.productId === 'string' &&
    typeof line.title === 'string' &&
    typeof line.unitPrice === 'number' &&
    (typeof line.imageUrl === 'string' || line.imageUrl === null) &&
    typeof line.quantity === 'number' &&
    Number.isSafeInteger(line.quantity) &&
    line.quantity > 0
  );
}

function readStoredLines(): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(parsed)
      ? parsed
          .filter(isCartLine)
          .map((l) => ({...l, quantity: Math.min(l.quantity, maxQuantity)}))
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({children}: {children: ReactNode}) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [checkoutState, setCheckoutState] =
    useState<CartContextValue['checkoutState']>('idle');

  // Read after hydration so server and first client render match.
  useEffect(() => {
    setLines(readStoredLines());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(lines));
    } catch {
      // Storage unavailable (private mode): the cart still works for this visit.
    }
  }, [lines, loaded]);

  const add = useCallback((input: CartLineInput) => {
    setLines((current) => {
      const existing = current.find((l) => l.productId === input.productId);
      if (!existing) return [...current, {...input, quantity: 1}];
      return current.map((l) =>
        l.productId === input.productId
          ? {...l, ...input, quantity: Math.min(l.quantity + 1, maxQuantity)}
          : l,
      );
    });
  }, []);

  const sync = useCallback((input: CartLineInput) => {
    setLines((current) => {
      const existing = current.find((l) => l.productId === input.productId);
      if (
        !existing ||
        (existing.unitPrice === input.unitPrice &&
          existing.title === input.title &&
          existing.imageUrl === input.imageUrl)
      ) {
        return current;
      }
      return current.map((l) => (l.productId === input.productId ? {...l, ...input} : l));
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((l) => l.productId !== productId)
        : current.map((l) =>
            l.productId === productId
              ? {...l, quantity: Math.min(quantity, maxQuantity)}
              : l,
          ),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((current) => current.filter((l) => l.productId !== productId));
  }, []);

  const startCheckout = useCallback(
    async (items: Array<{productId: string; quantity: number}>) => {
      if (items.length === 0 || checkoutState === 'pending') return;
      setCheckoutState('pending');
      try {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({lineItems: items}),
        });
        const body: unknown = await response.json();
        if (!response.ok || !isCheckoutSession(body)) throw new Error('checkout');
        window.location.assign(body.checkoutUrl);
      } catch {
        setCheckoutState('error');
      }
    },
    [checkoutState],
  );

  const checkout = useCallback(
    () => startCheckout(lines.map(({productId, quantity}) => ({productId, quantity}))),
    [lines, startCheckout],
  );

  const buyNow = useCallback(
    (input: CartLineInput) => startCheckout([{productId: input.productId, quantity: 1}]),
    [startCheckout],
  );

  const value = useMemo<CartContextValue>(() => {
    const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    return {
      lines,
      totalQuantity,
      subtotalLabel: formatOfferPrice(Math.round(subtotal * 100) / 100),
      add,
      sync,
      setQuantity,
      remove,
      checkout,
      buyNow,
      checkoutState,
    };
  }, [lines, add, sync, setQuantity, remove, checkout, buyNow, checkoutState]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const cart = useContext(CartContext);
  if (!cart) throw new Error('useCart must be used within a CartProvider');
  return cart;
}
