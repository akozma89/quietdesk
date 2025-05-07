/* eslint-disable no-undef */
import * as esbuild from 'esbuild';
import { resolve } from 'node:path';

async function build() {
  try {
    await esbuild.build({
      entryPoints: [resolve('test/browser/test-browser.js')],
      bundle: true,
      outfile: resolve('test/browser/bundle.js'),
      format: 'esm',
      platform: 'browser',
      sourcemap: true,
      minify: false,
      loader: { '.ts': 'ts' },
      logLevel: 'info',
      define: {
        // Define process.env for browser compatibility
        'process.env.NODE_ENV': '"production"',
        'global': 'window',
      },
      // Handle Node.js built-in modules
      external: ['worker_threads', 'stream', 'fs', 'path', 'os', 'util', 'crypto'],
    });
    
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    // Use a non-zero exit code to indicate failure
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    }
  }
}

build();
