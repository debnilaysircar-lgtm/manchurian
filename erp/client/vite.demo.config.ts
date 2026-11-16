/**
 * Builds the self-contained demo: one HTML file with the React UI, the server's business logic
 * and SQLite (compiled to JavaScript), so it can be shared as a single page with no server.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  define: {
    'process.env': '{}',
    'import.meta.env.VITE_DEMO': '"1"',
  },
  resolve: {
    alias: [
      { find: '@backend', replacement: here('./src/demo/backend.ts') },
      { find: 'better-sqlite3', replacement: here('./src/demo/sqlite.ts') },
      { find: 'express', replacement: here('./src/demo/express.ts') },
      { find: 'jsonwebtoken', replacement: here('./src/demo/shim-jwt.ts') },
      { find: 'node:crypto', replacement: here('./src/demo/shim-crypto.ts') },
      { find: 'node:fs', replacement: here('./src/demo/shim-fs.ts') },
      { find: 'node:path', replacement: here('./src/demo/shim-path.ts') },
      // Server code resolves its own dependencies (zod, bcryptjs) from server/node_modules.
      { find: 'zod', replacement: here('../server/node_modules/zod') },
      { find: 'bcryptjs', replacement: here('../server/node_modules/bcryptjs') },
    ],
  },
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
    modulePreload: false,
    chunkSizeWarningLimit: 4000,
  },
});
