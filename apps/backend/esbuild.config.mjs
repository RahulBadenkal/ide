import { build, context } from 'esbuild';
import { resolve } from 'path';
import { copy } from 'esbuild-plugin-copy';

const isDev = !!process.argv.includes('--dev')

const buildOptions = {
  entryPoints: [resolve(process.cwd(), 'src', 'main.ts')],
  outfile: resolve(process.cwd(), 'dist', 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  sourcemap: isDev,
  external: ["node_modules/*"],
  plugins: [
    copy({
      // this is equal to process.cwd(), which means we use cwd path as base path to resolve `to` path
      // if not specified, this plugin uses ESBuild.build outdir/outfile options as base path.
      resolveFrom: process.cwd(),
      assets: {
        from: ['./src/assets/*'],
        to: ["./dist/assets"],
      },
      watch: isDev,
    }),
  ],
};

if (isDev) {
  context(buildOptions).then(ctx => {
    if (isDev) {
      ctx.watch();
    } else {
      ctx.rebuild();
    }
  });
} else {
  build(buildOptions)
}
