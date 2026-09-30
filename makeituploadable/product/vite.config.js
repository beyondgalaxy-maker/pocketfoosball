import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({base:'./',build:{outDir:'site-dist',emptyOutDir:true,rollupOptions:{input:{index:resolve(import.meta.dirname,'index.html'),app:resolve(import.meta.dirname,'app.html')}}}});
