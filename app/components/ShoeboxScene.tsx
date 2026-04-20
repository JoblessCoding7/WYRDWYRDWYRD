import {useEffect, useRef} from 'react';
import type {BufferGeometry, Mesh} from 'three';

// Per-face texture imports
import texBoxBack from '~/assets/shoebox_mapping_textures/box_side_back.png';
import texBoxFront from '~/assets/shoebox_mapping_textures/box_side_botom.png';
import texBoxLeft from '~/assets/shoebox_mapping_textures/box_side_left.png';
import texBoxRight from '~/assets/shoebox_mapping_textures/box_side_right.png';
import texLidBack from '~/assets/shoebox_mapping_textures/lid_side_back.png';
import texLidLeft from '~/assets/shoebox_mapping_textures/lid_side_left.png';
import texLidRight from '~/assets/shoebox_mapping_textures/lid_side_right.png';
import texLidTop from '~/assets/shoebox_mapping_textures/lid_side_top.png';

interface ShoeboxSceneProps {
  onOpen: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

/*
 * ── Dimension derivation ─────────────────────────────────────────────────────
 *
 * All 3-D dimensions come directly from texture pixel aspect ratios.
 * Anchor: LW = 2.8 units (lid length along X).
 *
 * LID textures (px):
 *   lid_side_top   974x722  -> LW x LD
 *   lid_side_back  966x158  -> LW x LH
 *   lid_side_left  156x712  -> LH x LD
 *
 *   LW = 2.8
 *   LD = 2.8 x (722 / 974) x DEPTH_SCALE
 *   LH = 2.8 x (158 / 966)
 *
 * BOX textures (px):
 *   box_side_botom 958x691  -> BW x BH  (front face)
 *   box_side_left  314x690  -> BD x BH
 *   box_side_back  941x322  -> BW x BH  (back/front faces)
 *
 *   BD = LD  (box depth matches lid depth)
 *   BH = BD x (314 / 690)
 *   BW = BD x (958 / 691)
 * ────────────────────────────────────────────────────────────────────────────
 */

export function ShoeboxScene({onOpen, onHoverChange}: ShoeboxSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  const onHoverChangeRef = useRef(onHoverChange);
  useEffect(() => {
    onHoverChangeRef.current = onHoverChange;
  }, [onHoverChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animFrameId: number;
    let disposed = false;

    void Promise.all([
      import('three'),
      import('three/examples/jsm/postprocessing/EffectComposer.js'),
      import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/RenderPixelatedPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
      import('three/examples/jsm/postprocessing/FilmPass.js'),
      import('three/examples/jsm/postprocessing/OutputPass.js'),
      import('three/examples/jsm/postprocessing/ShaderPass.js'),
    ]).then(
      ([
        THREE,
        {EffectComposer},
        {RenderPass},
        {RenderPixelatedPass},
        {UnrealBloomPass},
        {FilmPass},
        {OutputPass},
        {ShaderPass},
      ]) => {
        if (disposed || !canvasRef.current) return;

        // ── Renderer ─────────────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: false,
        });
        renderer.setPixelRatio(1);
        renderer.setClearColor(0x000000, 0);
        const W = canvas.offsetWidth || window.innerWidth || 600;
        const H = canvas.offsetHeight || window.innerHeight || 420;
        renderer.setSize(W, H, false);

        // ── Scene / Camera ────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
        camera.position.set(-6.764, 2.55, 10.863);
        camera.lookAt(0, 0.5, 0);

        // ── Lighting ──────────────────────────────────────────────────────────────
        scene.add(new THREE.AmbientLight(0xffffff, 1.4));
        const dir = new THREE.DirectionalLight(0xffffff, 1.2);
        dir.position.set(3, 6, 5);
        scene.add(dir);
        const fill = new THREE.DirectionalLight(0xffffff, 0.4);
        fill.position.set(-4, 2, -3);
        scene.add(fill);

        // ── Post-processing (PS2 vibe) ────────────────────────────────────────────
        const composer = new EffectComposer(renderer);

        // 1. Base render
        composer.addPass(new RenderPass(scene, camera));

        // 2. Pixelation
        const pixelPass = new RenderPixelatedPass(2, scene, camera);
        composer.addPass(pixelPass);

        // 3. Bloom
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(W, H),
          0.4,
          0.6,
          0.85,
        );
        composer.addPass(bloomPass);

        // 4. Film grain
        const filmPass = new FilmPass(0.35, false);
        composer.addPass(filmPass);

        // 5. Scanlines
        const scanlineShader = {
          uniforms: {
            tDiffuse: {value: null},
            lineWidth: {value: 2.0},
            intensity: {value: 0.25},
            resolution: {value: H},
          },
          vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: /* glsl */ `
            uniform sampler2D tDiffuse;
            uniform float lineWidth;
            uniform float intensity;
            uniform float resolution;
            varying vec2 vUv;
            void main() {
              vec4 color = texture2D(tDiffuse, vUv);
              float scanline = mod(floor(vUv.y * resolution / lineWidth), 2.0);
              color.rgb *= 1.0 - intensity * scanline;
              gl_FragColor = color;
            }
          `,
        };
        const scanlinePass = new ShaderPass(scanlineShader);
        composer.addPass(scanlinePass);

        // 6. Output
        composer.addPass(new OutputPass());

        // ── Helpers ───────────────────────────────────────────────────────────────
        const loader = new THREE.TextureLoader();

        function loadTex(src: string) {
          const t = loader.load(src);
          t.colorSpace = THREE.SRGBColorSpace;
          return t;
        }

        const geometries: BufferGeometry[] = [];
        const materials: InstanceType<typeof THREE.MeshStandardMaterial>[] = [];

        function makeFace(
          w: number,
          h: number,
          tex: InstanceType<typeof THREE.Texture>,
        ): Mesh {
          const geo = new THREE.PlaneGeometry(w, h);
          geometries.push(geo);
          const mat = new THREE.MeshStandardMaterial({
            map: tex,
            side: THREE.DoubleSide,
          });
          materials.push(mat);
          return new THREE.Mesh(geo, mat);
        }

        // ── God rays — fixed in world space behind the box ────────────────────────
        const godRaysMat = new THREE.ShaderMaterial({
          uniforms: {
            uTime: {value: 0},
            uColor: {value: new THREE.Color(0xffffff)},
          },
          vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform vec3 uColor;
            varying vec2 vUv;

            float hash(float n) {
              return fract(sin(n) * 43758.5453123);
            }

            float beam(vec2 uv, float angle, float width, float len) {
              vec2 dir = vec2(cos(angle), sin(angle));
              float d = abs(dot(uv, vec2(-dir.y, dir.x)));
              float l = dot(uv, dir);
              float falloff = smoothstep(0.0, len, l) * (1.0 - smoothstep(len * 0.5, len, l));
              return smoothstep(width, 0.0, d) * falloff;
            }

            void main() {
              vec2 uv = vUv - 0.5;
              float dist = length(uv);

              float rays = 0.0;
              for (int i = 0; i < 24; i++) {
                float fi = float(i);
                float baseAngle = (fi / 24.0) * 6.28318;
                float angleJitter = hash(fi * 1.7) * 0.4 - 0.2;
                float angle = baseAngle + angleJitter + uTime * 0.12;
                float pulse = 0.5 + 0.5 * sin(uTime * (0.4 + hash(fi * 3.1) * 0.8) + fi * 2.3);
                float width = (0.004 + hash(fi * 5.3) * 0.03) * (0.6 + 0.4 * pulse);
                float len = 0.15 + hash(fi * 7.9) * 0.45 + pulse * 0.15;
                float brightness = 0.5 + hash(fi * 11.1) * 0.5;
                rays += beam(uv, angle, width, len) * brightness;
              }

              float core = smoothstep(0.18, 0.0, dist) * 0.7;
              rays += core;

              float radialFade = 1.0 - smoothstep(0.0, 0.52, dist);
              float alpha = rays * radialFade * 0.65;

              vec3 col = mix(uColor, vec3(1.0, 0.97, 0.88), core);
              gl_FragColor = vec4(col, alpha);
            }
          `,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        });

        const godRaysGeo = new THREE.PlaneGeometry(30, 30);
        geometries.push(godRaysGeo);
        const godRaysMesh = new THREE.Mesh(godRaysGeo, godRaysMat);
        // Center at the lookAt point and face directly toward the camera
        godRaysMesh.position.set(6, -2.5, -10);
        godRaysMesh.lookAt(camera.position);
        godRaysMesh.renderOrder = -1;
        scene.add(godRaysMesh);

        // ── Dimensions ───────────────────────────────────────────────────────────
        const LW = 2.8;
        const DEPTH_SCALE = 1.6;
        const LD = LW * (722 / 974) * DEPTH_SCALE;
        const LH = LW * (158 / 966);

        // ── Root group — lid + box animate together ───────────────────────────────
        const rootGroup = new THREE.Group();
        scene.add(rootGroup);

        // ── Lid ───────────────────────────────────────────────────────────────────
        const lidPivot = new THREE.Group();
        rootGroup.add(lidPivot);

        const lidGroup = new THREE.Group();
        lidGroup.position.set(0, LH / 2, LD / 2);
        lidPivot.add(lidGroup);

        const LID_W = (LW / 1.18) * 2;

        const lTop = makeFace(LID_W, LD, loadTex(texLidTop));
        lTop.rotation.x = -Math.PI / 2;
        lTop.position.set(0, LH / 2, 0);
        lidGroup.add(lTop);

        const lFront = makeFace(LID_W, LH, loadTex(texLidBack));
        lFront.position.set(0, 0, LD / 2);
        lidGroup.add(lFront);

        const lBack = makeFace(LID_W, LH, loadTex(texLidBack));
        lBack.rotation.y = Math.PI;
        lBack.position.set(0, 0, -LD / 2);
        lidGroup.add(lBack);

        const lLeft = makeFace(LH, LD, loadTex(texLidRight));
        lLeft.rotation.y = Math.PI / 2;
        lLeft.rotation.z = Math.PI / 2;
        lLeft.position.set(-LW / 1.18, 0, 0);
        lidGroup.add(lLeft);

        const lRight = makeFace(LH, LD, loadTex(texLidLeft));
        lRight.rotation.y = -Math.PI / 2;
        lRight.rotation.z = -Math.PI / 2;
        lRight.position.set(LW / 1.18, 0, 0);
        lidGroup.add(lRight);

        const lInside = makeFace(LID_W, LD, loadTex(texLidTop));
        lInside.rotation.x = Math.PI / 2;
        lInside.position.set(0, -LH / 2, 0);
        lidGroup.add(lInside);

        // ── Box ───────────────────────────────────────────────────────────────────
        const BD = LD;
        const BH = BD * (314 / 690);
        const BW = BD * (958 / 691);
        const BOX_INSET = 0.1;

        lidPivot.position.set(0, 0, -LD / 2);

        const boxGroup = new THREE.Group();
        boxGroup.position.set(0, -BH / 2, 0);
        rootGroup.add(boxGroup);

        const bLeft = makeFace(BH, BD, loadTex(texBoxRight));
        bLeft.rotation.y = Math.PI / 2;
        bLeft.rotation.z = Math.PI / 2;
        bLeft.position.set(-(LW / 1.17 - BOX_INSET), 0, 0);
        boxGroup.add(bLeft);

        const bRight = makeFace(BH, BD, loadTex(texBoxLeft));
        bRight.rotation.y = -Math.PI / 2;
        bRight.rotation.z = -Math.PI / 2;
        bRight.position.set(LW / 1.17 - BOX_INSET, 0, 0);
        boxGroup.add(bRight);

        const bFront = makeFace(BW, BH, loadTex(texBoxBack));
        bFront.position.set(0, 0, BD / 2);
        boxGroup.add(bFront);

        const bBack = makeFace(BW, BH, loadTex(texBoxBack));
        bBack.rotation.y = Math.PI;
        bBack.position.set(0, 0, -BD / 2);
        boxGroup.add(bBack);

        const bBottom = makeFace(BW, BD, loadTex(texBoxFront));
        bBottom.rotation.x = Math.PI / 2;
        bBottom.position.set(0, -BH / 2, 0);
        boxGroup.add(bBottom);

        // ── Raycasting ────────────────────────────────────────────────────────────
        const lidMeshes: Mesh[] = [];
        lidGroup.traverse((obj) => {
          if ((obj as Mesh).isMesh) lidMeshes.push(obj as Mesh);
        });
        const allMeshes: Mesh[] = [];
        rootGroup.traverse((obj) => {
          if ((obj as Mesh).isMesh) allMeshes.push(obj as Mesh);
        });

        // ── Interaction state ─────────────────────────────────────────────────────
        let isOpen = false;
        let isHovered = false;
        let onOpenCalled = false;
        let currentAngle = 0;
        let isEngaged = false;

        // ── Drag to rotate rootGroup ──────────────────────────────────────────────
        let isDragging = false;
        let dragDidMove = false; // true once pointer moved enough to count as a drag
        let prevMouseX = 0;
        let prevMouseY = 0;
        let dragStartX = 0;
        let dragStartY = 0;
        const DRAG_THRESHOLD = 4; // px — below this a press is treated as a click

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const setNDCFromClient = (clientX: number, clientY: number) => {
          const r = canvas.getBoundingClientRect();
          mouse.x = ((clientX - r.left) / r.width) * 2 - 1;
          mouse.y = -((clientY - r.top) / r.height) * 2 + 1;
        };

        const setNDC = (e: MouseEvent) =>
          setNDCFromClient(e.clientX, e.clientY);

        const hitsBox = () => {
          raycaster.setFromCamera(mouse, camera);
          return raycaster.intersectObjects(allMeshes, false).length > 0;
        };

        // ── Mouse drag ────────────────────────────────────────────────────────────
        const onMouseDown = (e: MouseEvent) => {
          // Only start a drag when the press lands on the box
          setNDC(e);
          if (!hitsBox()) return;
          isDragging = true;
          dragDidMove = false;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
          prevMouseX = e.clientX;
          prevMouseY = e.clientY;
        };

        const onDragMove = (e: MouseEvent) => {
          if (!isDragging) return;
          const dx = e.clientX - prevMouseX;
          const dy = e.clientY - prevMouseY;

          // Mark as a real drag once the pointer has moved past the threshold
          if (!dragDidMove) {
            const totalDx = e.clientX - dragStartX;
            const totalDy = e.clientY - dragStartY;
            if (
              Math.sqrt(totalDx * totalDx + totalDy * totalDy) > DRAG_THRESHOLD
            ) {
              dragDidMove = true;
            }
          }

          rootGroup.rotation.y += dx * 0.005;
          // Clamp vertical tilt so the box doesn't flip upside-down
          rootGroup.rotation.x = Math.max(
            -Math.PI / 4,
            Math.min(Math.PI / 4, rootGroup.rotation.x + dy * 0.005),
          );
          prevMouseX = e.clientX;
          prevMouseY = e.clientY;
        };

        const onMouseUp = () => {
          isDragging = false;
        };

        let lastHoverState = false;

        const notifyHover = (next: boolean) => {
          if (next === lastHoverState) return;
          lastHoverState = next;
          onHoverChangeRef.current?.(next);
        };

        const onMouseLeave = () => {
          // Reset hover / engaged state when the cursor leaves the canvas
          if (!isOpen) {
            isHovered = false;
            isEngaged = false;
            canvas.style.cursor = 'default';
            notifyHover(false);
          }
        };

        const onMouseMove = (e: MouseEvent) => {
          if (isOpen || isDragging) return;
          setNDC(e);
          const overBox = hitsBox();
          isHovered = overBox;
          isEngaged = overBox;
          canvas.style.cursor = overBox ? 'pointer' : 'default';
          notifyHover(overBox);
        };

        const onClick = (e: MouseEvent) => {
          // Suppress the click if the user actually dragged
          if (isDragging || dragDidMove) return;
          if (isOpen) return;
          setNDC(e);
          if (hitsBox()) {
            isEngaged = true;
            isOpen = true;
            isHovered = false;
            canvas.style.cursor = 'default';
            notifyHover(false);
          }
        };

        // ── Touch drag ────────────────────────────────────────────────────────────
        let prevTouchX = 0;
        let prevTouchY = 0;
        let touchDragDidMove = false;
        let touchStartX = 0;
        let touchStartY = 0;

        const onTouchStart = (e: TouchEvent) => {
          const t = e.touches[0];
          setNDCFromClient(t.clientX, t.clientY);
          if (!hitsBox()) return;
          prevTouchX = t.clientX;
          prevTouchY = t.clientY;
          touchStartX = t.clientX;
          touchStartY = t.clientY;
          touchDragDidMove = false;
          isDragging = true;
          dragDidMove = false;
        };

        const onTouchMove = (e: TouchEvent) => {
          if (!isDragging) return;
          e.preventDefault();
          const t = e.touches[0];
          const dx = t.clientX - prevTouchX;
          const dy = t.clientY - prevTouchY;

          if (!touchDragDidMove) {
            const totalDx = t.clientX - touchStartX;
            const totalDy = t.clientY - touchStartY;
            if (
              Math.sqrt(totalDx * totalDx + totalDy * totalDy) > DRAG_THRESHOLD
            ) {
              touchDragDidMove = true;
              dragDidMove = true;
            }
          }

          rootGroup.rotation.y += dx * 0.005;
          rootGroup.rotation.x = Math.max(
            -Math.PI / 4,
            Math.min(Math.PI / 4, rootGroup.rotation.x + dy * 0.005),
          );
          prevTouchX = t.clientX;
          prevTouchY = t.clientY;
        };

        const onTouchEnd = (e: TouchEvent) => {
          if (!isDragging) return;
          isDragging = false;

          // Treat as a tap → open if the touch barely moved
          if (!touchDragDidMove && !isOpen) {
            const t = e.changedTouches[0];
            setNDCFromClient(t.clientX, t.clientY);
            if (hitsBox()) {
              isEngaged = true;
              isOpen = true;
              isHovered = false;
              notifyHover(false);
            }
          }
        };

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onDragMove);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseleave', onMouseLeave);
        canvas.addEventListener('click', onClick);
        canvas.addEventListener('touchstart', onTouchStart, {passive: true});
        canvas.addEventListener('touchmove', onTouchMove, {passive: false});
        canvas.addEventListener('touchend', onTouchEnd);
        window.addEventListener('mouseup', onMouseUp);

        // ── Animation loop ────────────────────────────────────────────────────────
        const animate = () => {
          animFrameId = requestAnimationFrame(animate);

          // Responsive resize
          const cw = canvas.offsetWidth;
          const ch = canvas.offsetHeight;
          if (
            cw > 0 &&
            ch > 0 &&
            (canvas.width !== cw || canvas.height !== ch)
          ) {
            renderer.setSize(cw, ch, false);
            composer.setSize(cw, ch);
            camera.aspect = cw / ch;
            camera.updateProjectionMatrix();
            scanlinePass.uniforms['resolution'].value = ch;
          }

          // Idle — rotate and bob when not engaged and not dragging
          if (!isEngaged && !isDragging) {
            const t = performance.now() * 0.001;
            rootGroup.rotation.y += 0.001;
            rootGroup.position.y = Math.sin(t * 2) * 0.5;
          } else if (isEngaged && !isDragging) {
            // Snap rotation and bob back to 0 on hover
            rootGroup.rotation.x += (0 - rootGroup.rotation.x) * 0.06;
            rootGroup.rotation.y += (0 - rootGroup.rotation.y) * 0.06;
            rootGroup.position.y += (0 - rootGroup.position.y) * 0.06;
          }

          const target = isOpen ? Math.PI * 0.85 : isHovered ? Math.PI / 20 : 0;
          currentAngle += (target - currentAngle) * 0.07;
          lidPivot.rotation.x = -currentAngle;

          if (isOpen && !onOpenCalled && currentAngle > Math.PI * 0.7) {
            onOpenCalled = true;
            onOpenRef.current();
          }

          godRaysMat.uniforms.uTime.value = performance.now() * 0.001;

          composer.render();

          // Fade in the canvas on the first rendered frame
          if (canvas.style.opacity === '0') {
            canvas.style.opacity = '1';
          }
        };

        animate();

        // ── Cleanup ───────────────────────────────────────────────────────────────
        const cleanup = () => {
          cancelAnimationFrame(animFrameId);
          canvas.removeEventListener('mousedown', onMouseDown);
          canvas.removeEventListener('mousemove', onDragMove);
          canvas.removeEventListener('mousemove', onMouseMove);
          canvas.removeEventListener('mouseleave', onMouseLeave);
          canvas.removeEventListener('click', onClick);
          canvas.removeEventListener('touchstart', onTouchStart);
          canvas.removeEventListener('touchmove', onTouchMove);
          canvas.removeEventListener('touchend', onTouchEnd);
          window.removeEventListener('mouseup', onMouseUp);
          canvas.style.cursor = 'default';
          geometries.forEach((g) => g.dispose());
          materials.forEach((m) => m.dispose());
          godRaysMat.dispose();
          godRaysGeo.dispose();
          renderer.dispose();
        };

        if (disposed) {
          cleanup();
        } else {
          (canvas as any).__threeCleanup = cleanup;
        }
      },
    );

    return () => {
      disposed = true;
      cancelAnimationFrame(animFrameId!);
      const cleanup = (canvas as any).__threeCleanup;
      if (typeof cleanup === 'function') {
        cleanup();
        delete (canvas as any).__threeCleanup;
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        opacity: 0,
        transition: 'opacity 1s ease-in',
      }}
    />
  );
}
