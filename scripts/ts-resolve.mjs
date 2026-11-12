// Lets `node` run the TypeScript scripts in this folder: resolves extensionless relative imports
// ('../lib/canonical') to their .ts files. Node strips the types itself.
//   node --import ./scripts/ts-resolve.mjs scripts/e2e.ts
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (specifier.startsWith('.') && !/\.(ts|mts|js|mjs|cjs|json)$/.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw err;
    }
  },
});
