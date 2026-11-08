/** Animated ink marbling. The Canvas fallback also moves without WebGL. */
export function createBackground(initialCanvas: HTMLCanvasElement) {
  let canvas=initialCanvas,shop=false,reduced=false,dirty=true,disposed=false,raf=0;
  let draw:(time:number)=>void;
  let releaseGL=()=>{};
  function useCanvas(replace=false) {
    if(replace){const next=canvas.cloneNode() as HTMLCanvasElement;canvas.replaceWith(next);canvas=next;}
    canvas.width=640;canvas.height=360;canvas.dataset.renderer='canvas2d';
    const ctx=canvas.getContext('2d',{alpha:false})!;
    const small=document.createElement('canvas');small.width=192;small.height=108;
    const smallCtx=small.getContext('2d',{alpha:false})!;
    const pixels=smallCtx.createImageData(192,108);
    draw=(time)=>{
      const t=time*.58;
      for(let y=0;y<108;y++)for(let x=0;x<192;x++){
        let px=(x/192-.5)*1.7778,py=y/108-.5;
        px+=.19*Math.sin(py*5+t*.7);py+=.15*Math.cos(px*4-t*.5);
        const radius=Math.hypot(px,py),angle=Math.atan2(py,px);
        const f=.5+.5*Math.sin(radius*18-angle*2-t*1.4+Math.sin(px*5+py*4+t*.5)*1.6);
        const k=f*f*(3-2*f),i=(y*192+x)*4;
        const edge=1-.35*Math.hypot(x/192-.5,y/108-.5);
        pixels.data[i]=(shop?62+k*56:17+k*47)*edge;
        pixels.data[i+1]=(shop?28+k*37:56+k*50)*edge;
        pixels.data[i+2]=(shop?28+k*22:47+k*23)*edge;
        pixels.data[i+3]=255;
      }
      smallCtx.putImageData(pixels,0,0);ctx.drawImage(small,0,0,640,360);
    };
    dirty=true;
  }
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false});
  if(!gl)useCanvas();
  else try {
    const compile=(type:number,source:string)=>{
      const shader=gl.createShader(type)!;gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)??'Background shader failed');
      return shader;
    };
    const vertex=compile(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}');
    const fragment=compile(gl.FRAGMENT_SHADER,`
      precision mediump float;
      varying vec2 uv;
      uniform float time,shop;
      void main(){
        float t=time*.58;
        vec2 p=(uv-.5)*vec2(1.7778,1.);
        p+=.19*vec2(sin(p.y*5.+t*.7),cos(p.x*4.-t*.5));
        p+=.075*vec2(cos(p.y*9.-t*.3),sin(p.x*7.+t*.4));
        float r=length(p),a=atan(p.y,p.x);
        float ink=.5+.5*sin(r*18.-a*2.-t*1.4+sin(p.x*5.+p.y*4.+t*.5)*1.6);
        float silk=.5+.5*sin(r*32.-a*3.-t*1.2);
        vec3 dark=mix(vec3(.067,.22,.184),vec3(.243,.11,.11),shop);
        vec3 light=mix(vec3(.25,.416,.275),vec3(.463,.255,.196),shop);
        vec3 color=mix(dark,light,smoothstep(.05,.95,ink));
        color+=.012*silk;
        color*=1.-.35*length(uv-.5);
        gl_FragColor=vec4(color,1.);
      }`);
    const program=gl.createProgram()!;gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Background shader link failed');
    const buffer=gl.createBuffer();
    releaseGL=()=>{gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);};
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const ut=gl.getUniformLocation(program,'time'),us=gl.getUniformLocation(program,'shop');
    canvas.width=960;canvas.height=540;gl.viewport(0,0,960,540);canvas.dataset.renderer='webgl';
    draw=(time)=>{gl.uniform1f(ut,time);gl.uniform1f(us,shop?1:0);gl.drawArrays(gl.TRIANGLES,0,6);};
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(!disposed)useCanvas(true);});
  } catch {useCanvas(true);}
  let previous=0,lastDraw=0,time=0;
  function frame(now:number){
    if(disposed)return;
    // Keep a paused tab from jumping the simulation when the user returns.
    if(previous&&!reduced)time+=Math.min(now-previous,100)/1000;
    previous=now;
    if((!reduced&&now-lastDraw>40)||dirty){draw(time);lastDraw=now;dirty=false;}
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  return {
    destroy(){disposed=true;cancelAnimationFrame(raf);releaseGL();gl?.getExtension('WEBGL_lose_context')?.loseContext();},
    setShop(value:boolean){shop=value;dirty=true;},
    setReduced(value:boolean){reduced=value;dirty=true;},
  };
}
