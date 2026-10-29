import {useCart, type CartLineInput} from '~/lib/cart';

export function AddToCartButton({
  children,
  disabled,
  line,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  line: CartLineInput;
  onClick?: () => void;
}) {
  const {add} = useCart();
  return (
    <button
      type="submit"
      disabled={disabled}
      onClick={() => {
        add(line);
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}
