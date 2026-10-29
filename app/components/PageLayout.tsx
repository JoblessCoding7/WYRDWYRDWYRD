import {useLocation} from 'react-router';
import {Aside, useAside} from '~/components/Aside';
import {CartMain} from '~/components/CartMain';
import {Footer} from '~/components/Footer';
import {Header} from '~/components/Header';
import {CartProvider} from '~/lib/cart';

export function PageLayout({children = null}: {children?: React.ReactNode}) {
  return (
    <CartProvider>
      <Aside.Provider>
        <PageContent>{children}</PageContent>
      </Aside.Provider>
    </CartProvider>
  );
}

function PageContent({children}: {children?: React.ReactNode}) {
  const location = useLocation();
  const {type} = useAside();
  const cartOpen = type === 'cart';

  return (
    <>
      <Aside type="cart" heading="CART">
        <CartMain layout="aside" />
      </Aside>
      {location.pathname !== '/' && <Header />}
      <main className={cartOpen ? 'page-blurred' : ''}>{children}</main>
      <Footer className={cartOpen ? 'page-blurred' : ''} />
    </>
  );
}
