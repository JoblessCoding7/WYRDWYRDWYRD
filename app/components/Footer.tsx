const instagramUrl = 'https://www.instagram.com/wyrdwyrdwyrdwyrd';

/**
 * Static footer. It used to come from the Shopify "footer" menu; add links
 * here (policies etc.) as the China site needs them.
 */
export function Footer({className}: {className?: string}) {
  return (
    <footer className={['footer', className].filter(Boolean).join(' ')}>
      <nav className="footer-menu" role="navigation">
        <a href={instagramUrl} rel="noopener noreferrer" target="_blank" aria-label="Instagram">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-label="Instagram"
            role="img"
          >
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
          </svg>
        </a>
      </nav>
    </footer>
  );
}
