import {useEffect, useRef} from 'react';
import type {BufferGeometry, Mesh} from 'three';

// Per-face texture imports
import texBoxBack from '~/assets/shoebox_mapping_textures/KT2_Box-mapping-05-box-side-front-back.png';
import texBoxFront from '~/assets/shoebox_mapping_textures/KT2_Box mapping-01-box-front-side.png';
import texBoxLeft from '~/assets/shoebox_mapping_textures/KT2_Box-mapping-04-box-right-side.png';
import texBoxRight from '~/assets/shoebox_mapping_textures/KT2_Box-mapping-02-box-label-side.png';
import texLidBack from '~/assets/shoebox_mapping_textures/KT2_Box mapping-09-lid-back.png';
import texLidLeft from '~/assets/shoebox_mapping_textures/KT2_Box-mapping-06-lid-left.png';
import texLidRight from '~/assets/shoebox_mapping_textures/KT2_Box-mapping-08-lid-right.png';
import texLidTop from '~/assets/shoebox_mapping_textures/KT2_Box-mapping-07-lid.png';

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
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
      import('three/examples/jsm/postprocessing/OutputPass.js'),
      import('three/examples/jsm/environments/RoomEnvironment.js'),
    ]).then(
      ([
        THREE,
        {EffectComposer},
        {RenderPass},
        {UnrealBloomPass},
        {OutputPass},
        {RoomEnvironment},
      ]) => {
        if (disposed || !canvasRef.current) return;

        // ── Renderer ─────────────────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.85;
        const W = canvas.offsetWidth || window.innerWidth || 600;
        const H = canvas.offsetHeight || window.innerHeight || 420;
        renderer.setSize(W, H, false);

        // ── Scene / Camera ────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
        camera.position.set(-6.764, 2.55, 10.863);
        camera.lookAt(0, 0.5, 0);

        // ── Lighting ──────────────────────────────────────────────────────────────
        scene.add(new THREE.AmbientLight(0xffffff, 0.35));

        // Key light — casts sharp shadows from upper-right
        const dir = new THREE.DirectionalLight(0xffffff, 1.2);
        dir.position.set(4, 8, 6);
        dir.castShadow = true;
        dir.shadow.mapSize.set(1024, 1024);
        dir.shadow.camera.near = 0.5;
        dir.shadow.camera.far = 30;
        scene.add(dir);

        // Fill light — cool-tinted from the left to soften shadows
        const fill = new THREE.DirectionalLight(0xddeeff, 0.25);
        fill.position.set(-5, 2, -2);
        scene.add(fill);

        // Specular point light — gives the gloss hotspot on the box surface
        const spec = new THREE.PointLight(0xffffff, 1.6, 18);
        spec.position.set(2, 5, 7);
        scene.add(spec);

        // Rim light — subtle back-edge highlight
        const rim = new THREE.DirectionalLight(0xffffff, 0.2);
        rim.position.set(-2, -1, -6);
        scene.add(rim);

        // ── Environment map (PMREM from neutral grey) for physical reflections ──
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const neutralEnv = pmremGenerator.fromScene(
          new RoomEnvironment(),
        ).texture;
        scene.environment = neutralEnv;
        pmremGenerator.dispose();

        // ── Post-processing (clean / glossy) ─────────────────────────────────────
        const composer = new EffectComposer(renderer);

        // 1. Base render
        composer.addPass(new RenderPass(scene, camera));

        // 2. Subtle bloom — just enough to make specular highlights glow
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(W, H),
          0.18, // strength  — very restrained
          0.4, // radius
          0.88, // threshold — only the brightest highlights bloom
        );
        composer.addPass(bloomPass);

        // 3. Output (tone-mapping + sRGB conversion)
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

        // Plain colour face — used for all interior surfaces
        function makeColorFace(w: number, h: number, color = 0x333333): Mesh {
          const geo = new THREE.PlaneGeometry(w, h);
          geometries.push(geo);
          const mat = new THREE.MeshStandardMaterial({
            color,
            side: THREE.DoubleSide,
            roughness: 0.8,
            metalness: 0.0,
          });
          materials.push(mat);
          return new THREE.Mesh(geo, mat);
        }

        function makeFace(
          w: number,
          h: number,
          tex: InstanceType<typeof THREE.Texture>,
        ): Mesh {
          const geo = new THREE.PlaneGeometry(w, h);
          geometries.push(geo);
          // MeshPhysicalMaterial gives us roughness + clearcoat for a glossy finish
          const mat = new THREE.MeshPhysicalMaterial({
            map: tex,
            side: THREE.DoubleSide,
            roughness: 0.25, // low roughness = sharp specular highlight
            metalness: 0.0, // cardboard, not metal
            clearcoat: 0.6, // lacquer-style gloss layer on top
            clearcoatRoughness: 0.1,
            envMapIntensity: 1.2, // how strongly it reflects the env map
            transparent: true, // respect PNG alpha channel
            alphaTest: 0.01, // discard pixels below 1% opacity
          });
          materials.push(mat as any);
          return new THREE.Mesh(geo, mat);
        }

        // ── Dimensions ───────────────────────────────────────────────────────────
        const LW = 2.8;
        const DEPTH_SCALE = 1.6;
        const LD = LW * (722 / 974) * DEPTH_SCALE;
        const LH = LW * (158 / 966) * 1.5; // taller lid
        const LID_OVERHANG = 0.28; // how far lid rim drops below box top

        // ── Root group — lid + box animate together ───────────────────────────────
        const rootGroup = new THREE.Group();
        scene.add(rootGroup);

        // ── Lid ───────────────────────────────────────────────────────────────────
        const lidPivot = new THREE.Group();
        rootGroup.add(lidPivot);

        const lidGroup = new THREE.Group();
        // Lower lid so the rim drops LID_OVERHANG below the box top (y=0)
        lidGroup.position.set(0, LH / 2 - LID_OVERHANG, LD / 2);
        lidPivot.add(lidGroup);

        const LID_W = (LW / 1.12) * 2; // wider — overhangs box sides

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

        const texLeft = loadTex(texLidLeft);
        texLeft.repeat.y = -1;
        texLeft.offset.y = 1;
        const lLeft = makeFace(LH, LD, texLeft);
        lLeft.rotation.y = Math.PI / 2;
        lLeft.rotation.z = Math.PI / 2;
        lLeft.position.set(-LW / 1.12, 0, 0);
        lidGroup.add(lLeft);

        const texRight = loadTex(texLidRight);
        texRight.repeat.y = -1;
        texRight.offset.y = 1;
        const lRight = makeFace(LH, LD, texRight);
        lRight.rotation.y = -Math.PI / 2;
        lRight.rotation.z = -Math.PI / 2;
        lRight.position.set(LW / 1.12, 0, 0);
        lidGroup.add(lRight);

        // Lid interior bottom — off-black, no texture
        const lInside = makeColorFace(LID_W, LD);
        lInside.rotation.x = Math.PI / 2;
        lInside.position.set(0, -LH / 2, 0);
        lidGroup.add(lInside);

        // ── Box ───────────────────────────────────────────────────────────────────
        const BD = LD;
        const BH = BD * (314 / 690) * 0.8; // shorter box
        const BW = BD * (958 / 691);
        const BOX_INSET = 0.1;

        lidPivot.position.set(0, 0, -LD / 2);

        const boxGroup = new THREE.Group();
        boxGroup.position.set(0, -BH / 2, 0);
        rootGroup.add(boxGroup);

        const texBLeft = loadTex(texBoxRight);
        texBLeft.repeat.set(-1, 1);
        texBLeft.offset.set(1, 0);
        const bLeft = makeFace(BH, BD, texBLeft);
        bLeft.rotation.y = Math.PI / 2;
        bLeft.rotation.z = Math.PI / 2;
        bLeft.position.set(-(LW / 1.17 - BOX_INSET), 0, 0);
        boxGroup.add(bLeft);

        const texBRight2 = loadTex(texBoxLeft);
        texBRight2.repeat.set(-1, 1);
        texBRight2.offset.set(1, 0);
        const bRight = makeFace(BH, BD, texBRight2);
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

        // Box interior top opening — off-black face visible when lid lifts
        const bInterior = makeColorFace(BW, BD);
        bInterior.rotation.x = Math.PI / 2;
        bInterior.position.set(0, BH / 2, 0);
        boxGroup.add(bInterior);

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
