import {useState, useCallback, useRef, useEffect} from 'react';
import {createPortal} from 'react-dom';
import {motion, AnimatePresence} from 'framer-motion';
import type {ProductOffer} from '~/lib/product-offer';
import {ShoeboxScene} from '~/components/ShoeboxScene';
import lightBeam from '~/assets/Light Beam.png';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import {useCart} from '~/lib/cart';

export type Kt2ProductView = {
  productId: string;
  title: string;
  descriptionHtml: string;
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    width: number | null;
    height: number | null;
  }>;
  offer: ProductOffer;
};

interface KillThomeTwoProductProps {
  product: Kt2ProductView;
}

type LightboxImage = Kt2ProductView['images'][number];

export function KillThomeTwoProduct({product}: KillThomeTwoProductProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    setIsDesktop(!window.matchMedia('(pointer: coarse)').matches);
  }, []);
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(
    null,
  );
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const labelRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cursorPos = useRef({x: 0, y: 0});
  const isPausedRef = useRef(false);
  const images = product.images;

  const {open} = useAside();
  const {sync} = useCart();
  const {offer} = product;
  const cartLine = {
    productId: product.productId,
    title: product.title,
    unitPrice: offer.unitPrice,
    imageUrl: product.images[0]?.url ?? null,
  };

  // A cart saved earlier may hold an old price; show the current one.
  useEffect(() => {
    if (offer.isAvailable) sync(cartLine);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync, offer.isAvailable, offer.unitPrice, product.productId, product.title]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleHoverChange = useCallback(
    (hovered: boolean) => {
      if (!isDesktop) return;
      setIsHovered(hovered);
    },
    [isDesktop],
  );

  useEffect(() => {
    if (!isDesktop) return;
    const stage = stageRef.current;
    const label = labelRef.current;
    if (!stage || !label) return;

    const onMove = (e: MouseEvent) => {
      cursorPos.current = {x: e.clientX, y: e.clientY};
      label.style.transform = `translate(${e.clientX + 18}px, ${e.clientY - 20}px)`;
    };

    stage.addEventListener('mousemove', onMove);
    return () => stage.removeEventListener('mousemove', onMove);
  }, [isDesktop]);

  const openLightbox = useCallback(
    (index: number) => {
      setLightboxIndex(index);
      setLightboxImage(images[index]);
      isPausedRef.current = true;
    },
    [images],
  );

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
    isPausedRef.current = false;
  }, []);

  const lightboxPrev = useCallback(() => {
    const next = (lightboxIndex - 1 + images.length) % images.length;
    setLightboxIndex(next);
    setLightboxImage(images[next]);
  }, [lightboxIndex, images]);

  const lightboxNext = useCallback(() => {
    const next = (lightboxIndex + 1) % images.length;
    setLightboxIndex(next);
    setLightboxImage(images[next]);
  }, [lightboxIndex, images]);

  useEffect(() => {
    if (!lightboxImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') lightboxPrev();
      if (e.key === 'ArrowRight') lightboxNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxImage, closeLightbox, lightboxPrev, lightboxNext]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || images.length === 0) return;

    const SPEED = 0.3; 
    let rafId: number;
    let isDragging = false;
    let dragDidMove = false;
    let dragStartX = 0;
    let dragScrollLeft = 0;
    let pos = 0;
    let setWidth = 0;

    rafId = requestAnimationFrame(() => {
      const items =
        carousel.querySelectorAll<HTMLElement>('.kt2-carousel-item');
      const setCount = items.length / 3;

      const gap = 20; 
      for (let i = 0; i < setCount; i++) {
        setWidth += items[i].offsetWidth + gap;
      }

      pos = setWidth;
      carousel.scrollLeft = pos;

      const tick = () => {
        if (!isDragging && !isPausedRef.current) {
          pos += SPEED;

          if (pos >= setWidth * 2) pos -= setWidth;
          if (pos < 0) pos += setWidth;

          carousel.scrollLeft = pos;
        } else {
          pos = carousel.scrollLeft;
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    });

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      dragDidMove = false;
      dragStartX = e.pageX;
      dragScrollLeft = carousel.scrollLeft;
      carousel.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const walk = (e.pageX - dragStartX) * 1.2;
      if (Math.abs(walk) > 4) dragDidMove = true;
      carousel.scrollLeft = dragScrollLeft - walk;
    };

    const onMouseUp = () => {
      isDragging = false;
      carousel.style.cursor = 'grab';
    };

    const onMouseLeave = () => {
      isDragging = false;
      carousel.style.cursor = 'grab';
      isPausedRef.current = false;
    };

    const onMouseEnter = () => {
      isPausedRef.current = true;
    };

    let touchStartX = 0;
    let touchScrollLeft = 0;
    let touchDidMove = false;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].pageX;
      touchScrollLeft = carousel.scrollLeft;
      touchDidMove = false;
      isDragging = true;
      isPausedRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const walk = (e.touches[0].pageX - touchStartX) * 1.2;
      if (Math.abs(walk) > 6) touchDidMove = true;
      pos = touchScrollLeft - walk;
      if (pos >= setWidth * 2) pos -= setWidth;
      if (pos < 0) pos += setWidth;
      carousel.scrollLeft = pos;
    };

    const onTouchEnd = (e: TouchEvent) => {
      isDragging = false;
      isPausedRef.current = false;

      if (!touchDidMove) {
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const item = target?.closest(
          '.kt2-carousel-item',
        ) as HTMLElement | null;
        if (item) {
          const rawIdx = Number(item.dataset.index);
          if (!Number.isNaN(rawIdx)) openLightbox(rawIdx % images.length);
        }
      }
    };

    const onClick = (e: MouseEvent) => {
      if (dragDidMove) return;
      const item = (e.target as HTMLElement).closest(
        '.kt2-carousel-item',
      ) as HTMLElement | null;
      if (!item) return;
      const rawIdx = Number(item.dataset.index);
      if (!Number.isNaN(rawIdx)) {
        openLightbox(rawIdx % images.length);
      }
    };

    carousel.addEventListener('mouseenter', onMouseEnter);
    carousel.addEventListener('mousedown', onMouseDown);
    carousel.addEventListener('mousemove', onMouseMove);
    carousel.addEventListener('mouseup', onMouseUp);
    carousel.addEventListener('mouseleave', onMouseLeave);
    carousel.addEventListener('click', onClick);
    carousel.addEventListener('touchstart', onTouchStart, {passive: true});
    carousel.addEventListener('touchmove', onTouchMove, {passive: true});
    carousel.addEventListener('touchend', onTouchEnd);

    return () => {
      cancelAnimationFrame(rafId);
      carousel.removeEventListener('mouseenter', onMouseEnter);
      carousel.removeEventListener('mousedown', onMouseDown);
      carousel.removeEventListener('mousemove', onMouseMove);
      carousel.removeEventListener('mouseup', onMouseUp);
      carousel.removeEventListener('mouseleave', onMouseLeave);
      carousel.removeEventListener('click', onClick);
      carousel.removeEventListener('touchstart', onTouchStart);
      carousel.removeEventListener('touchmove', onTouchMove);
      carousel.removeEventListener('touchend', onTouchEnd);
    };
  }, [isOpen, images, openLightbox]);

  return (
    <div className="kt2-scene">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="kt2-carousel"
            ref={carouselRef}
            className="kt2-carousel"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: 0.5, ease: 'easeOut'}}
          >
            {[...images, ...images, ...images].map((image, idx) => (
              <div
                key={`${image.id}-${idx}`}
                className="kt2-carousel-item"
                data-index={idx}
                role="button"
                tabIndex={-1}
                aria-hidden={idx < images.length || idx >= images.length * 2}
                aria-label={`View ${image.altText ?? 'image'} in detail`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    openLightbox(idx % images.length);
                }}
              >
                <img
                  src={image.url}
                  alt={image.altText ?? ''}
                  width={image.width ?? undefined}
                  height={image.height ?? undefined}
                  draggable={false}
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <img
        src={lightBeam}
        alt=""
        aria-hidden="true"
        className="kt2-light-beam"
      />

      <div
        className={`kt2-shoebox-stage${isOpen ? ' kt2-shoebox-stage--blurred' : ''}`}
        ref={stageRef}
      >
        <ShoeboxScene onOpen={handleOpen} onHoverChange={handleHoverChange} />
      </div>

      <div
        ref={labelRef}
        className={[
          'kt2-cursor-label',
          isDesktop ? 'kt2-cursor-label--desktop' : 'kt2-cursor-label--mobile',
          !isOpen && (isDesktop ? isHovered : true)
            ? 'kt2-cursor-label--visible'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      >
        What makes Thome a misfit kid?
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="kt2-info-panel"
            className="kt2-info-panel"
            initial={{opacity: 0, x: 60}}
            animate={{opacity: 1, x: 0}}
            exit={{opacity: 0, x: 60}}
            transition={{duration: 0.5, delay: 0.2, ease: 'easeOut'}}
          >
            <h1 className="kt2-title">{product.title}</h1>

            {product.descriptionHtml && (
              <div
                className="kt2-description"
                dangerouslySetInnerHTML={{__html: product.descriptionHtml}}
              />
            )}

            <div className="kt2-buy-row">
              <div className="kt2-price">{offer.priceLabel}</div>
              <AddToCartButton
                disabled={!offer.isAvailable}
                onClick={() => open('cart')}
                line={cartLine}
              >
                {offer.isAvailable ? 'Add to cart' : 'Sold out'}
              </AddToCartButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {lightboxImage && (
              <motion.div
                key="kt2-lightbox"
                className="kt2-lightbox"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: 0.25, ease: 'easeOut'}}
                onClick={closeLightbox}
                role="dialog"
                aria-modal="true"
                aria-label="Image lightbox"
              >
                <motion.div
                  className="kt2-lightbox-img-wrap"
                  initial={{scale: 0.82, opacity: 0}}
                  animate={{scale: 1, opacity: 1}}
                  exit={{scale: 0.82, opacity: 0}}
                  transition={{duration: 0.3, ease: [0.22, 1, 0.36, 1]}}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={lightboxImage.url}
                    alt={lightboxImage.altText ?? ''}
                    draggable={false}
                    className="kt2-lightbox-img"
                  />
                </motion.div>

                <button
                  className="kt2-lightbox-btn kt2-lightbox-close"
                  onClick={closeLightbox}
                  aria-label="Close lightbox"
                >
                  ✕
                </button>

                {images.length > 1 && (
                  <button
                    className="kt2-lightbox-btn kt2-lightbox-prev"
                    onClick={(e) => {
                      e.stopPropagation();
                      lightboxPrev();
                    }}
                    aria-label="Previous image"
                  >
                    ←
                  </button>
                )}

                {images.length > 1 && (
                  <button
                    className="kt2-lightbox-btn kt2-lightbox-next"
                    onClick={(e) => {
                      e.stopPropagation();
                      lightboxNext();
                    }}
                    aria-label="Next image"
                  >
                    →
                  </button>
                )}

                {images.length > 1 && (
                  <div className="kt2-lightbox-counter">
                    {lightboxIndex + 1} / {images.length}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
