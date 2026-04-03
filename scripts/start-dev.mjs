import { createServer } from 'vite';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

const server = await createServer({
  configFile: resolve(__dirname, 'vite.config.ts'),
  root: __dirname,
  server: { port: 5173 },
});
await server.listen();
server.printUrls();
