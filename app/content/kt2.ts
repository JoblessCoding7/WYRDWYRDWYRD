/**
 * KT2 content shown on the product page — part of the WYRD design, so it lives
 * here, not in Youzan. Youzan only supplies price and stock.
 *
 * `images` = the carousel: what's inside the KT2 merch box. Files are in
 * public/kt2/; add, remove or reorder entries to change the carousel.
 */
export const kt2Content = {
  handle: 'album-product',
  title: 'KILL THOME 2 LIMITED EDITION MERCH',
  descriptionHtml:
    '<p>Limited edition merchandise presented in a miniature shoebox. Includes a card-sized USB drive containing all 16 tracks from the album, a sticker set, a 102-page booklet, and a crumpled report sheet.</p>',
  images: [
    {src: '/kt2/kt2-box.svg', alt: 'KT2 miniature shoebox', width: 605, height: 443},
    {src: '/kt2/kt2-id-card-usb.svg', alt: 'ID card and card-sized USB drive', width: 595, height: 281},
    {src: '/kt2/kt2-notebook.svg', alt: '102-page booklet', width: 332, height: 434},
    {src: '/kt2/kt2-stickers.svg', alt: 'Sticker set', width: 694, height: 415},
    {src: '/kt2/kt2-printed-materials.svg', alt: 'Crumpled report sheet', width: 428, height: 394},
  ],
} as const;
