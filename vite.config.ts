import { defineConfig } from 'vite';
export default defineConfig({base:'./',build:{target:'es2022',rollupOptions:{
 input:{index:'index.html',engine:'src/run-api.ts'},preserveEntrySignatures:'strict',
 output:{entryFileNames:chunk=>chunk.name==='engine'?'engine.js':'assets/[name]-[hash].js'},
}}});
