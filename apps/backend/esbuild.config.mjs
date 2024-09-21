import { build } from 'esbuild';
import { resolve } from 'path';
import { copy } from 'esbuild-plugin-copy';
import fs from "fs"

const packageJsonFile = JSON.parse(fs.readFileSync(resolve(process.cwd(), "../", "../", "package.json"), "utf-8"))
const dependencies = Object.keys(packageJsonFile.dependencies)
const devDependencies = Object.keys(packageJsonFile.devDependencies)


await build({
  entryPoints: [resolve(process.cwd(), 'src', 'main.ts')],
  outfile: resolve(process.cwd(), 'dist', 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  minify: false,
  sourcemap: true,
  external: dependencies.concat(devDependencies),
  plugins: [
    copy({
      // this is equal to process.cwd(), which means we use cwd path as base path to resolve `to` path
      // if not specified, this plugin uses ESBuild.build outdir/outfile options as base path.
      resolveFrom: process.cwd(),
      assets: [
        {
          from: ['./src/public/*'],
          to: ["./dist/public"],
        }
      ],
    }),
  ],
})