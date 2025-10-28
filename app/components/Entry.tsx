'use client';
import {useState, useEffect, useRef} from 'react';
import {motion} from 'framer-motion';
import Matter from 'matter-js';
import {KlaviyoForm} from './KlaviyoForm';

import STATE1 from '../assets/WYRD_STATE_1.png';
import STATE2 from '../assets/WYRD_STATE_2.png';
import STATE3 from '../assets/WYRD_STATE_3.png';
import STATE4 from '../assets/WYRD_STATE_4.png';

import ICON1 from '../assets/icon1.svg';
import ICON2 from '../assets/icon2.svg';
import ICON3 from '../assets/icon3.svg';
import ICON4 from '../assets/icon4.svg';
import ICON5 from '../assets/icon5.svg';
import ICON6 from '../assets/icon6.svg';
import ICON7 from '../assets/icon7.svg';

export const Entry = () => {
  const [currentImage, setCurrentImage] = useState(STATE1);
  const [hideLogoAnimation, setHideLogoAnimation] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [viewport, setViewport] = useState({width: 0, height: 0});
  const sceneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const setSize = () =>
      setViewport({width: window.innerWidth, height: window.innerHeight});
    setSize();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(setSize, 120);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

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
    const timeout = setTimeout(() => setHideLogoAnimation(true), 2700);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [hideLogoAnimation]);

  useEffect(() => {
    if (!hideLogoAnimation || !sceneRef.current) return;
    if (viewport.width === 0 || viewport.height === 0) return;

    const {width, height} = viewport;
    const engine = Matter.Engine.create();
    const world = engine.world;
    engine.gravity.y = 1;

    const logoSize = width <= 768 ? 100 : 300;
    const logoScale = width <= 768 ? 0.1 : 0.3;

    const logoBody = Matter.Bodies.rectangle(
      width / 2,
      -100,
      logoSize,
      logoSize,
      {
        friction: 0.2,
        restitution: 0.9,
        render: {
          sprite: {texture: STATE2, xScale: logoScale, yScale: logoScale},
        },
      },
    );

    const leftWall = Matter.Bodies.rectangle(-20, height / 2, 40, height, {
      isStatic: true,
      render: {fillStyle: 'transparent'},
    });
    const rightWall = Matter.Bodies.rectangle(
      width + 20,
      height / 2,
      40,
      height,
      {
        isStatic: true,
        render: {fillStyle: 'transparent'},
      },
    );
    const slope1 = Matter.Bodies.rectangle(
      width * 0.3,
      height * 0.3,
      width * 0.3,
      height * 0.05,
      {isStatic: true, angle: Math.PI / 5, render: {fillStyle: 'transparent'}},
    );
    const slope2 = Matter.Bodies.rectangle(
      width * 0.8,
      height * 0.5,
      width * 0.2,
      height * 0.05,
      {isStatic: true, angle: -Math.PI / 5, render: {fillStyle: 'transparent'}},
    );
    const ground = Matter.Bodies.rectangle(width / 2, height - 30, width, 40, {
      isStatic: true,
      render: {fillStyle: 'transparent'},
    });

    Matter.World.add(world, [logoBody, slope1, slope2, leftWall, rightWall]);

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine,
      options: {width, height, wireframes: false, background: 'transparent'},
    });

    const mouse = Matter.Mouse.create(render.canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: {stiffness: 0.2, render: {visible: false}},
    });
    Matter.World.add(world, mouseConstraint);

    const iconImages = [ICON1, ICON2, ICON3, ICON4, ICON5, ICON6, ICON7];
    const iconBodies: Matter.Body[] = iconImages.map((icon, i) => {
      const iconSize = width <= 768 ? 60 : 100;
      const scale = width <= 768 ? 0.2 : 0.4;
      const spacing = width / (iconImages.length + 1);
      const xPos = spacing * (i + 1) + (Math.random() - 0.5) * 50;
      const yPos = -Math.random() * height * 0.5 - 50;
      const delay = Math.random() * (2000 - 1000) + 1000;
      return Matter.Bodies.rectangle(xPos, yPos, iconSize, iconSize, {
        friction: 0.2,
        restitution: 0.9,
        render: {sprite: {texture: icon, xScale: scale, yScale: scale}},
        plugin: {delay},
      });
    });

    Matter.Events.on(
      mouseConstraint,
      'startdrag',
      (e: Matter.IEvent<Matter.MouseConstraint>) => {
        const body = (e as any).body as Matter.Body | undefined;
        if (!body || !iconBodies.includes(body)) {
          (mouseConstraint as any).body = null;
        }
      },
    );

    setTimeout(() => {
      Matter.Render.run(render);
      const runner = Matter.Runner.create();
      Matter.Runner.run(runner, engine);
    }, 3000);

    let iconsAdded = false;
    const update = () => {
      if (logoBody.position.y > height + 200 && !iconsAdded) {
        setTimeout(() => setShowSignup(true), 1000);
        Matter.World.add(world, [ground, ...iconBodies]);
        iconsAdded = true;
      }
      requestAnimationFrame(update);
    };
    update();

    return () => {
      Matter.Render.stop(render);
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
      if (render.canvas) render.canvas.remove();
    };
  }, [hideLogoAnimation, viewport.width, viewport.height]);

  return (
    <div className="entry-animation">
      <motion.div
        className="klaviyo-container"
        initial={{opacity: 0, y: -5}}
        animate={showSignup ? {opacity: 1, y: 0} : {opacity: 0, y: -5}}
        transition={{ease: 'easeOut', duration: 0.6}}
      >
        <KlaviyoForm />
      </motion.div>
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
      </div>
      {hideLogoAnimation && (
        <div
          ref={sceneRef}
          style={{width: '100%', height: '100%', position: 'absolute'}}
          className="canvas-container"
        />
      )}
    </div>
  );
};
