import {defineConfig} from 'vite';
export default defineConfig({
 publicDir:'public',
 build:{outDir:'dist-sdk',emptyOutDir:true,target:'es2022',minify:false,
  lib:{entry:{sdk:'src/sdk.ts',engine:'src/run-api.ts',strategy:'src/strategy.ts'},formats:['es'],fileName:(_,name)=>name+'.js'},
  rollupOptions:{output:{chunkFileNames:'chunks/[name]-[hash].js'}},
 },
});
