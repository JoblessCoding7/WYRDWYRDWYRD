import {Link, useLoaderData} from 'react-router';
import {useState} from 'react';
import type {Route} from './+types/checkout.mock';
import {kt2Content} from '~/content/kt2';
import {parseCheckoutQuantity} from '~/lib/checkout';
import {formatOfferPrice, kt2MockOffer} from '~/lib/product-offer';

/** Local demo checkout used when COMMERCE_PROVIDER=mock. Collects and sends nothing. */
export const meta: Route.MetaFunction = () => [{title: '结账演示 – WYRD'}];

export async function loader({request}: Route.LoaderArgs) {
  const quantity = parseCheckoutQuantity(
    new URL(request.url).searchParams.get('quantity') ?? undefined,
  );
  return {quantity};
}

const box: React.CSSProperties = {maxWidth: 520, margin: '120px auto', padding: 24};

export default function MockCheckout() {
  const {quantity} = useLoaderData<typeof loader>();
  const [paid, setPaid] = useState(false);

  if (quantity === null) {
    return (
      <div style={box}>
        <h1>没有有效的演示商品</h1>
        <Link to="/products/album-product">返回商店</Link>
      </div>
    );
  }

  const total = formatOfferPrice(kt2MockOffer.unitPrice * quantity);
  return (
    <div style={box}>
      <p>演示模式 · 未连接有赞 · 不会收款或生成订单</p>
      <h1>{paid ? '模拟付款成功' : '结账演示'}</h1>
      <p>
        {kt2Content.title} × {quantity} = {total}
      </p>
      {paid ? (
        <Link to="/">返回 WYRD</Link>
      ) : (
        <button type="button" onClick={() => setPaid(true)}>
          模拟付款 {total}
        </button>
      )}
    </div>
  );
}
