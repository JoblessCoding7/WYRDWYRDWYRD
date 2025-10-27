import {useState, useEffect, useRef} from 'react';
import {motion} from 'framer-motion';
import Matter from 'matter-js';

import STATE1 from '../assets/WYRD_STATE_1.png';
import STATE2 from '../assets/WYRD_STATE_2.png';
import STATE3 from '../assets/WYRD_STATE_3.png';
import STATE4 from '../assets/WYRD_STATE_4.png';

export const Entry = () => {
  const [currentImage, setCurrentImage] = useState(STATE1);
  const [hideLogoAnimation, setHideLogoAnimation] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const sceneRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const images = [STATE1, STATE2, STATE3, STATE4];
    let current = 0;

    const interval = setInterval(() => {
      if (hideLogoAnimation) {
        clearInterval(interval);
        return;
      }

      current = (current + 1) % images.length;
      setCurrentImage(images[current]);
    }, 200);

    const timeout = setTimeout(() => {
      setHideLogoAnimation(true);
    }, 2700);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [hideLogoAnimation]);

  /* MATTER PHYSICS */
  useEffect(() => {
    if (!hideLogoAnimation || !sceneRef.current) return;

    const engine = Matter.Engine.create();
    const world = engine.world;
    world.gravity.y = 1;

    const logoBody = Matter.Bodies.rectangle(
      window.innerWidth / 2,
      0,
      100,
      100,
      {
        friction: 0.2,
        restitution: 1,
        render: {
          fillStyle: 'transparent',
        },
      },
    );

    const slope = Matter.Bodies.rectangle(window.innerWidth / 2, 500, 600, 40, {
      isStatic: true,
      angle: Math.PI / 20,
      render: {
        fillStyle: 'transparent',
      },
    });

    Matter.World.add(world, [logoBody, slope]);

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: 'transparent',
      },
    });

    setTimeout(() => {
      Matter.Render.run(render);

      const runner = Matter.Runner.create();
      Matter.Runner.run(runner, engine);
    }, 3000);

    const update = () => {
      if (logoRef.current) {
        logoRef.current.style.transform = `translate(${logoBody.position.x / window.innerWidth}px, ${logoBody.position.y - 420}px) rotate(${logoBody.angle}rad)`;
      }

      if (logoBody.position.y > window.innerHeight + 200) {
        setTimeout(() => {
          setShowSignup(true);
          console.log('show the sign up');
        }, 1000);
      }

      requestAnimationFrame(update);
    };
    update();

    return () => {
      Matter.Render.stop(render);
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
      if (render.canvas) {
        render.canvas.remove();
      }
    };
  }, [hideLogoAnimation]);

  return (
    <div className="entry-animation">
      <div className="logo-container">
        <motion.img
          className="state-logos"
          src={currentImage}
          alt="WYRD State Logos"
          initial={{opacity: 0, y: -5}}
          animate={
            !hideLogoAnimation ? {opacity: 1, y: 0} : {opacity: 0, y: -5}
          }
          transition={{ease: 'easeOut', duration: 0.6, delay: 1}}
        />
        {hideLogoAnimation && (
          <motion.img
            ref={logoRef}
            src={STATE2}
            className="logo"
            alt="Main Logo"
            initial={{opacity: 0, y: -5}}
            animate={hideLogoAnimation && {opacity: 1, y: 0}}
            transition={{ease: 'easeOut', duration: 0.6, delay: 3}}
            style={{
              position: 'absolute',
              width: '400px',
              height: '400px',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      {hideLogoAnimation && (
        <div
          ref={sceneRef}
          style={{width: '100%', height: '100%', position: 'absolute'}}
        />
      )}
    </div>
  );
};
