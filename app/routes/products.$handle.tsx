import {redirect, useLoaderData, useNavigate} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {KillThomeTwoProduct} from '~/components/KillThomeTwoProduct';
import wyrdLogo from '~/assets/WYRD_LOGO.png';
import {useState, useEffect, useRef} from 'react';
import {motion} from 'framer-motion';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `Hydrogen | ${data?.product.title ?? ''}`},
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    product,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context, params}: Route.LoaderArgs) {
  // Put any API calls that is not critical to be available on first page render
  // For example: product reviews, product recommendations, social feeds.

  return {};
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml} = product;

  // Render the KT2 custom scene for the album-product handle
  if (product.handle === 'album-product') {
    return <KT2Scene product={product as any} />;
  }

  return (
    <div className="product">
      <ProductImage image={selectedVariant?.image} />
      <div className="product-main">
        <h1>{title}</h1>
        <ProductPrice
          price={selectedVariant?.price}
          compareAtPrice={selectedVariant?.compareAtPrice}
        />
        <br />
        <ProductForm
          productOptions={productOptions}
          selectedVariant={selectedVariant}
        />
        <br />
        <br />
        <p>
          <strong>Description</strong>
        </p>
        <br />
        <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
        <br />
      </div>
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

function KT2Scene({product}: {product: any}) {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);
  const [logoTarget, setLogoTarget] = useState<{
    x: number;
    y: number;
    scale: number;
  } | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  // Calculate the full-screen logo target (reverse of _index.tsx shrink)
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const imgAspect = 1855 / 1029;
      let renderedW: number;
      if (vw / vh > imgAspect) {
        renderedW = vh * imgAspect;
      } else {
        renderedW = vw;
      }
      const headerSize = Math.min(Math.max(vw * 0.06, 40), 80);
      const scale = renderedW / headerSize; // inverse — grow to full
      const headerCenterX = 16 + headerSize / 2;
      const headerCenterY = 16 + headerSize / 2;
      // From header corner back to screen center
      const x = vw / 2 - headerCenterX;
      const y = vh / 2 - headerCenterY;
      setLogoTarget({x, y, scale});
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const handleLogoClick = () => {
    if (exiting || !logoTarget) return;
    setExiting(true);
    // Fade out the scene
    if (sceneRef.current) {
      sceneRef.current.style.transition = 'opacity 0.4s ease-out';
      sceneRef.current.style.opacity = '0';
    }
  };

  return (
    <>
      {/* Logo starts at header position and expands to fullscreen on exit */}
      <motion.img
        src={wyrdLogo}
        alt="WYRD"
        className="wyrd-header-logo"
        initial={{scale: 1, x: 0, y: 0}}
        animate={
          exiting && logoTarget
            ? {scale: logoTarget.scale, x: logoTarget.x, y: logoTarget.y}
            : {scale: 1, x: 0, y: 0}
        }
        transition={{duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.2}}
        onAnimationComplete={() => {
          if (exiting) void navigate('/');
        }}
        onClick={handleLogoClick}
        style={{cursor: 'pointer', transformOrigin: 'center center'}}
      />
      <div
        ref={sceneRef}
        style={{height: '100dvh', width: '100%', overflow: 'hidden'}}
      >
        <KillThomeTwoProduct product={product} />
      </div>
    </>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    images(first: 20) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;
