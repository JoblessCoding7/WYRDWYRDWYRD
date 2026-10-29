import {useLoaderData, useNavigate} from 'react-router';
import {useState, useEffect, useRef} from 'react';
import {motion} from 'framer-motion';
import type {Route} from './+types/products.$handle';
import {
  KillThomeTwoProduct,
  type Kt2ProductView,
} from '~/components/KillThomeTwoProduct';
import wyrdLogo from '~/assets/WYRD_LOGO.png';
import {kt2Content} from '~/content/kt2';
import {kt2StorefrontProductId} from '~/lib/checkout';
import {getKt2Offer} from '~/lib/catalog.server';

export const meta: Route.MetaFunction = ({data}) => [
  {title: data?.product.title ?? 'WYRD'},
  {tagName: 'link', rel: 'canonical', href: `/products/${kt2Content.handle}`},
];

export async function loader({params}: Route.LoaderArgs) {
  if (params.handle !== kt2Content.handle) {
    throw new Response(null, {status: 404});
  }

  // Price and stock from the commerce provider (Youzan); copy and carousel images
  // are WYRD design content from content/kt2.
  const offer = await getKt2Offer();
  const product: Kt2ProductView = {
    productId: kt2StorefrontProductId,
    title: kt2Content.title,
    descriptionHtml: kt2Content.descriptionHtml,
    images: kt2Content.images.map((image) => ({
      id: image.src,
      url: image.src,
      altText: image.alt,
      width: image.width,
      height: image.height,
    })),
    offer,
  };
  return {product};
}

export default function Product() {
  const {product} = useLoaderData<typeof loader>();
  return <KT2Scene product={product} />;
}

function KT2Scene({product}: {product: Kt2ProductView}) {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);
  const [logoTarget, setLogoTarget] = useState<{
    x: number;
    y: number;
    scale: number;
  } | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);


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
      const scale = renderedW / headerSize;
      const headerCenterX = 16 + headerSize / 2;
      const headerCenterY = 16 + headerSize / 2;

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

    if (sceneRef.current) {
      sceneRef.current.style.transition = 'opacity 0.4s ease-out';
      sceneRef.current.style.opacity = '0';
    }
  };

  return (
    <>
      {                                                                      }
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
