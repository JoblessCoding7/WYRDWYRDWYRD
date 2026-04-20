import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router';
import {motion} from 'framer-motion';
import wyrdLogo from '~/assets/WYRD_LOGO.png';

export const meta = () => [{title: 'Wyrd'}];

export default function Homepage() {
  const navigate = useNavigate();
  const [animating, setAnimating] = useState(false);
  const [target, setTarget] = useState<{
    x: number;
    y: number;
    scale: number;
  } | null>(null);

  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Logo aspect ratio (1855 x 1029)
      const imgAspect = 1855 / 1029;

      // Rendered size with object-fit: contain inside 100vw x 100vh
      let renderedW: number;
      let renderedH: number;
      if (vw / vh > imgAspect) {
        // Height is the constraining dimension
        renderedH = vh;
        renderedW = vh * imgAspect;
      } else {
        // Width is the constraining dimension
        renderedW = vw;
        renderedH = vw / imgAspect;
      }

      // Header logo target size: clamp(40px, 6vw, 80px)
      const headerSize = Math.min(Math.max(vw * 0.06, 40), 80);

      // Scale based on rendered width so it fits the header logo
      const scale = headerSize / renderedW;

      // Header logo center position
      const headerCenterX = 16 + headerSize / 2;
      const headerCenterY = 16 + headerSize / 2;

      // Translate from screen center to header logo center
      const x = headerCenterX - vw / 2;
      const y = headerCenterY - vh / 2;

      setTarget({x, y, scale});
    };

    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const handleClick = () => {
    if (animating || !target) return;
    setAnimating(true);
  };

  return (
    <motion.div className="wyrd-home" onClick={handleClick}>
      <motion.img
        src={wyrdLogo}
        alt="WYRD"
        initial={{scale: 1, x: 0, y: 0}}
        animate={
          animating && target
            ? {scale: target.scale, x: target.x, y: target.y}
            : {scale: 1, x: 0, y: 0}
        }
        transition={{duration: 0.6, ease: [0.4, 0, 0.2, 1]}}
        onAnimationComplete={() => {
          if (animating) void navigate('/products/album-product');
        }}
        style={{
          height: 'auto',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    </motion.div>
  );
}
