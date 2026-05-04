import type {ProductFragment} from 'storefrontapi.generated';
import {
  Money,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {useState, useCallback, useRef, useEffect} from 'react';
import {createPortal} from 'react-dom';
import {motion, AnimatePresence} from 'framer-motion';
import {useNavigate} from 'react-router';
import {ShoeboxScene} from '~/components/ShoeboxScene';
import lightBeam from '~/assets/Light Beam.png';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';

interface KillThomeTwoProductProps {
  product: ProductFragment & {
    images: {
      nodes: Array<{
        id: string;
        url: string;
        altText: string | null;
        width: number;
        height: number;
      }>;
    };
  };
}

type LightboxImage =
  KillThomeTwoProductProps['product']['images']['nodes'][number];

export function KillThomeTwoProduct({product}: KillThomeTwoProductProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(
    null,
  );
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const labelRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cursorPos = useRef({x: 0, y: 0});
  const isPausedRef = useRef(false);
  const images = product.images.nodes;

  const navigate = useNavigate();
  const {open} = useAside();

  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleHoverChange = useCallback((hovered: boolean) => {
    setIsHovered(hovered);
  }, []);

  // Drive label position directly via DOM — no React re-render per frame
  useEffect(() => {
    const stage = stageRef.current;
    const label = labelRef.current;
    if (!stage || !label) return;

    const onMove = (e: MouseEvent) => {
      cursorPos.current = {x: e.clientX, y: e.clientY};
      label.style.transform = `translate(${e.clientX + 18}px, ${e.clientY - 20}px)`;
    };

    stage.addEventListener('mousemove', onMove);
    return () => stage.removeEventListener('mousemove', onMove);
  }, []);

  // Open lightbox — exposed to carousel items via data attribute click
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

  // Keyboard navigation for lightbox
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

  // Infinite auto-scroll carousel
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || images.length === 0) return;

    const SPEED = 0.3; // px per frame
    let rafId: number;
    let isDragging = false;
    let dragDidMove = false;
    let dragStartX = 0;
    let dragScrollLeft = 0;

    // Wait one frame for the DOM to paint so offsetWidth is correct
    rafId = requestAnimationFrame(() => {
      // ── Measure one set width (the middle clone) ──────────────────────────
      // The carousel contains 3× the images: [copy A | original | copy B]
      // We auto-scroll through the original, and when we hit the start of
      // copy B we silently jump back to the start of the original.
      const items =
        carousel.querySelectorAll<HTMLElement>('.kt2-carousel-item');
      const setCount = items.length / 3;

      // Width of exactly one full set (gap included)
      // Use the first `setCount` items to measure
      let setWidth = 0;
      const gap = 20; // must match CSS gap
      for (let i = 0; i < setCount; i++) {
        setWidth += items[i].offsetWidth + gap;
      }

      // Start scrolled to the beginning of the original (middle) set
      // Use a float accumulator so sub-pixel speeds (e.g. 0.2) work correctly —
      // scrollLeft rounds to integers on many browsers so we can't increment it
      // directly with small values.
      let pos = setWidth;
      carousel.scrollLeft = pos;

      // ── Animation tick ────────────────────────────────────────────────────
      const tick = () => {
        if (!isDragging && !isPausedRef.current) {
          pos += SPEED;

          // When we've scrolled past the original into copy B, jump back
          if (pos >= setWidth * 2) pos -= setWidth;
          // Safety: if dragged before copy A's start, jump forward
          if (pos < 0) pos += setWidth;

          carousel.scrollLeft = pos;
        } else {
          // Keep pos in sync while dragging so auto-scroll resumes smoothly
          pos = carousel.scrollLeft;
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    });

    // ── Drag to manually scroll ───────────────────────────────────────────
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

    // ── Click — open lightbox for the tapped item (any clone) ────────────
    const onClick = (e: MouseEvent) => {
      if (dragDidMove) return;
      const item = (e.target as HTMLElement).closest(
        '.kt2-carousel-item',
      ) as HTMLElement | null;
      if (!item) return;
      const rawIdx = Number(item.dataset.index);
      if (!Number.isNaN(rawIdx)) {
        // data-index on clones is offset by setCount — mod back to original
        openLightbox(rawIdx % images.length);
      }
    };

    carousel.addEventListener('mouseenter', onMouseEnter);
    carousel.addEventListener('mousedown', onMouseDown);
    carousel.addEventListener('mousemove', onMouseMove);
    carousel.addEventListener('mouseup', onMouseUp);
    carousel.addEventListener('mouseleave', onMouseLeave);
    carousel.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(rafId);
      carousel.removeEventListener('mouseenter', onMouseEnter);
      carousel.removeEventListener('mousedown', onMouseDown);
      carousel.removeEventListener('mousemove', onMouseMove);
      carousel.removeEventListener('mouseup', onMouseUp);
      carousel.removeEventListener('mouseleave', onMouseLeave);
      carousel.removeEventListener('click', onClick);
    };
  }, [isOpen, images, openLightbox]);

  // Visible options (skip single-value options — nothing to choose)
  const visibleOptions = productOptions.filter(
    (o) => o.optionValues.length > 1,
  );

  return (
    <div className="kt2-scene">
      {/* ── Carousel — fades in, centred over the shoebox ── */}
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
            {/* Triple the images: [copy A | original | copy B] for infinite loop */}
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

      {/* ── Light beam — static PNG behind the canvas ── */}
      <img
        src={lightBeam}
        alt=""
        aria-hidden="true"
        className="kt2-light-beam"
      />

      {/* ── Shoebox stage — always centred, never unmounts ── */}
      <div
        className={`kt2-shoebox-stage${isOpen ? ' kt2-shoebox-stage--blurred' : ''}`}
        ref={stageRef}
      >
        <ShoeboxScene onOpen={handleOpen} onHoverChange={handleHoverChange} />
      </div>

      {/* ── Cursor-following hover label ── */}
      <div
        ref={labelRef}
        className={`kt2-cursor-label${isHovered && !isOpen ? ' kt2-cursor-label--visible' : ''}`}
        aria-hidden="true"
      >
        What makes Thome a misfit kid?
      </div>

      {/* ── Info panel — slides in from the right when open ── */}
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
            {/* 1. Product name */}
            <h1 className="kt2-title">{product.title}</h1>

            {/* 2. Product description */}
            {product.descriptionHtml && (
              <div
                className="kt2-description"
                dangerouslySetInnerHTML={{__html: product.descriptionHtml}}
              />
            )}

            {/* 3. Variant options (only when there's a real choice) */}
            {visibleOptions.length > 0 && (
              <div className="kt2-options">
                {visibleOptions.map((option) => (
                  <div className="kt2-option-group" key={option.name}>
                    <h5 className="kt2-option-name">{option.name}</h5>
                    <div className="kt2-option-values">
                      {option.optionValues.map((value) => {
                        const {
                          name,
                          handle,
                          variantUriQuery,
                          selected,
                          available,
                          exists,
                          isDifferentProduct,
                        } = value;

                        if (isDifferentProduct) {
                          return (
                            <a
                              key={option.name + name}
                              href={`/products/${handle}?${variantUriQuery}`}
                              className={`kt2-option-btn${selected ? ' kt2-option-btn--selected' : ''}${!available ? ' kt2-option-btn--unavailable' : ''}`}
                            >
                              {name}
                            </a>
                          );
                        }

                        return (
                          <button
                            key={option.name + name}
                            type="button"
                            disabled={!exists}
                            className={`kt2-option-btn${selected ? ' kt2-option-btn--selected' : ''}${!available ? ' kt2-option-btn--unavailable' : ''}`}
                            onClick={() => {
                              if (!selected) {
                                void navigate(`?${variantUriQuery}`, {
                                  replace: true,
                                  preventScrollReset: true,
                                });
                              }
                            }}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. Price + Add to cart — same row */}
            <div className="kt2-buy-row">
              <div className="kt2-price">
                {selectedVariant?.compareAtPrice ? (
                  <div className="kt2-price-sale">
                    <Money data={selectedVariant.price} />
                    <s>
                      <Money data={selectedVariant.compareAtPrice} />
                    </s>
                  </div>
                ) : selectedVariant?.price ? (
                  <Money data={selectedVariant.price} />
                ) : null}
              </div>

              <AddToCartButton
                disabled={!selectedVariant || !selectedVariant.availableForSale}
                onClick={() => open('cart')}
                lines={
                  selectedVariant
                    ? [
                        {
                          merchandiseId: selectedVariant.id,
                          quantity: 1,
                          selectedVariant,
                        },
                      ]
                    : []
                }
              >
                {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
              </AddToCartButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Lightbox ── */}
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
                {/* Centred image — scale up from carousel size */}
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

                {/* Close button */}
                <button
                  className="kt2-lightbox-btn kt2-lightbox-close"
                  onClick={closeLightbox}
                  aria-label="Close lightbox"
                >
                  ✕
                </button>

                {/* Prev */}
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

                {/* Next */}
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

                {/* Counter */}
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
