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
  };
});
