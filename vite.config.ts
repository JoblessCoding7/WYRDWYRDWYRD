import {defineConfig, loadEnv} from 'vite';
import {reactRouter} from '@react-router/dev/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({mode}) => {
  // Make .env / .env.local visible to server code (process.env) during `react-router dev`.
  // In production the process manager provides the environment (see docs/deploy.md).
  process.env = {...loadEnv(mode, process.cwd(), ''), ...process.env};

  return {
    plugins: [reactRouter(), tsconfigPaths()],
    build: {
      assetsInlineLimit: 0,
    },
    optimizeDeps: {
      // Pre-bundle everything the browser loads up front, including the lazily
      // imported three.js modules. Otherwise Vite discovers them on first visit,
      // re-optimizes, and the open page ends up with two React copies
      // ("Cannot read properties of null (reading 'useContext')").
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router',
        'react-router/dom',
        'framer-motion',
        'matter-js',
        'three',
        'three/examples/jsm/environments/RoomEnvironment.js',
        'three/examples/jsm/postprocessing/EffectComposer.js',
        'three/examples/jsm/postprocessing/OutputPass.js',
        'three/examples/jsm/postprocessing/RenderPass.js',
        'three/examples/jsm/postprocessing/UnrealBloomPass.js',
      ],
    },
  };
});
