/** Independently authored surface finishes, matched to the Wiki's original-game reference renders. */
const vertex=`attribute vec2 position; varying vec2 uv;
void main(){ uv=position*.5+.5; gl_Position=vec4(position,0.,1.); }`;
const fragment=`precision highp float;
varying vec2 uv;
uniform sampler2D art;
uniform float finish, enhancement, time, glass;
uniform vec2 pointer;
const float TAU=6.28318530718;
vec3 rgb2hsv(vec3 c){
  vec4 K=vec4(0.,-1./3.,2./3.,-1.);
  vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));
  vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));
  float d=q.x-min(q.w,q.y),e=.000001;
  return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x);
}
vec3 hsv2rgb(vec3 c){vec3 p=abs(fract(c.xxx+vec3(0.,2./3.,1./3.))*6.-3.);return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 substrate(vec3 c,vec2 p){
  float diagonal=p.x*.7+p.y;
  if(enhancement<.5)return c;
  vec3 coat=vec3(1.);
  if(enhancement<1.5)coat=mix(vec3(.49,.70,.88),vec3(.84,.92,.96),.5+.4*sin(diagonal*28.));
  else if(enhancement<2.5)coat=mix(vec3(.85,.52,.51),vec3(.97,.83,.77),.5+.4*sin(diagonal*28.));
  else if(enhancement<3.5){vec2 cell=floor(p*8.);float n=mod(cell.x+cell.y,4.);coat=n<1.?vec3(.94,.65,.58):n<2.?vec3(.66,.79,.9):n<3.?vec3(.9,.83,.57):vec3(.69,.82,.66);}
  else if(enhancement<4.5)coat=vec3(1.);
  else if(enhancement<5.5)coat=mix(vec3(.46,.55,.62),vec3(.93,.96,.96),pow(.5+.5*sin(diagonal*9.),2.));
  else if(enhancement<6.5){float cell=hash(floor(p*vec2(11.,15.)));c=vec3(.52,.58,.57)+cell*.10;float crack=smoothstep(.02,0.,abs(p.y-p.x*.6-.2));return c-crack*.14;}
  else if(enhancement<7.5)coat=mix(vec3(.68,.44,.13),vec3(1.,.89,.56),.5+.5*sin(diagonal*9.));
  else{float dots=step(length(fract(p*13.)-.5),.16);coat=mix(vec3(.72,.85,.66),vec3(.35,.64,.48),dots*.3);}
  return c*coat;
}
void main(){
  // Work at source-pixel centers, including the original transparent silhouette.
  vec2 p=vec2(uv.x,1.-uv.y);
  vec4 tex=texture2D(art,p);
  if(tex.a<.002&&glass<.5){gl_FragColor=vec4(0.);return;}
  vec3 c=substrate(tex.rgb,p);
  vec2 q=p*vec2(1.,1.338);
  float phase=time*.17+pointer.x*.30+pointer.y*.16;
  if(finish<1.5){
    // Concentric engraved rings and a moving cross-shaped specular reflection.
    vec2 center=vec2(.50+sin(phase)*.07,.67+cos(phase*.8)*.06);
    float radius=length(q-center);
    float ring=pow(.5+.5*cos(radius*TAU*26.+phase*2.),18.);
    float etch=pow(.5+.5*cos(radius*TAU*52.+.7),24.);
    float cross=pow(max(0.,1.-abs(q.x-center.x)*24.),3.)+pow(max(0.,1.-abs(q.y-center.y)*24.),3.);
    float waves=sin(q.x*9.-q.y*3.+phase*2.)*.5+.5;
    float chroma=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));
    float darkInk=1.-smoothstep(.44,.7,max(c.r,max(c.g,c.b)));
    c=c*vec3(.60,.60,.95)+vec3(.16,.14,.045)+vec3(.12,0.,.38)*chroma;
    c=mix(c,c*vec3(.25,.25,1.8)+vec3(0.,0.,.25),darkInk*.8);
    c+=vec3(.20,.23,.28)*ring+vec3(.08)*etch;
    c+=vec3(.20,.23,.23)*cross+vec3(.06,.03,.07)*waves;
  }else if(finish<2.5){
    // A repeated triangular diffraction lattice stays on the printed surface.
    float a=q.x*3.8, b=(q.x*.5+q.y*.8660254)*3.8, d=a-b;
    float distance=min(abs(fract(a+.5)-.5),min(abs(fract(b+.5)-.5),abs(fract(d+.5)-.5)));
    float edge=1.-smoothstep(.022,.055,distance);
    float facet=sin(a*1.9+phase)*cos(b*1.5-phase);
    float hue=fract(.59+facet*.23+phase*.12);
    vec3 sheen=hsv2rgb(vec3(hue,.18,.99));
    c=mix(c,c*sheen,.95);
    c=mix(c,hsv2rgb(vec3(fract(hue+.25),.17,1.)),edge*.48);
    c=mix(c,vec3(.95,.90,.96),.06);
  }else if(finish<3.5){
    // Hue rotates through the ink; nearly neutral stock stays nearly neutral.
    vec3 hsv=rgb2hsv(c);
    float darkInk=1.-smoothstep(.44,.7,hsv.z);
    hsv.y=max(hsv.y,darkInk*.65);hsv.z=max(hsv.z,darkInk*.52);
    float hueShift=.18+q.x*.30-q.y*.16+.10*sin(phase*1.6+q.x*2.4+q.y*1.7);
    hsv.x=fract(hsv.x+hueShift);
    vec3 rainbow=hsv2rgb(hsv);
    float neutral=1.-smoothstep(.03,.22,hsv.y);
    vec3 paperTint=hsv2rgb(vec3(fract(q.x*.65-q.y*.4+phase*.12),.035,1.));
    c=mix(rainbow,rainbow*paperTint,neutral*.75);
    c*=.97+.03*sin(q.x*5.+q.y*3.+phase);
  }else{
    // Invert tonal value into navy stock; colored ink keeps a spectral hue.
    vec3 hsv=rgb2hsv(c);
    float low=min(c.r,min(c.g,c.b)),high=max(c.r,max(c.g,c.b));
    float delta=high-low;
    float value=clamp(1.35-low,0.,1.);
    float saturation=clamp(.45*low+delta*(.30+.40*c.b),.12,.85);
    float sweep=.5+.5*sin(q.x*9.-q.y*2.+phase*1.5);
    float hue=fract(hsv.x+.05+.13*(1.-p.y)+sweep*.025-.06*c.b+.06*c.r);
    hue=mix(.605+sweep*.022,hue,smoothstep(.02,.12,delta));
    c=hsv2rgb(vec3(hue,saturation,value));
    c*=.80+.50*sweep;
  }
  float alpha=tex.a;
  if(glass>.5){
    // Only the surface ink is opaque; edition reflections stay transmissive.
    float reflection=finish<2.5?.13:.07;
    alpha=max(tex.a,reflection);
    c=mix(c,hsv2rgb(vec3(fract(q.x*.6+phase*.1),.24,1.)),(1.-tex.a)*.5);
  }
  gl_FragColor=vec4(clamp(c,0.,1.),alpha);
}`;

type Entry={surface:HTMLElement;canvas:HTMLCanvasElement;context:CanvasRenderingContext2D;image:HTMLImageElement;texture:WebGLTexture|null;enhancement:number;glass:boolean};
const finishes=['foil','holographic','polychrome','negative'];
const enhancements=['none','bonus','mult','wild','glass','steel','stone','gold','lucky'];

/** One shared GPU context renders all visible finishes. CSS remains available without WebGL. */
export function bindEditionRenderer(root:HTMLElement,isReduced:()=>boolean){
  const gpu=document.createElement('canvas');gpu.width=142;gpu.height=190;
  const gl=gpu.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});
  if(!gl){root.dataset.editionRenderer='css';return {destroy(){}};}
  const compile=(type:number,source:string)=>{
    const shader=gl.createShader(type)!;gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){root.dataset.editionError=gl.getShaderInfoLog(shader)??'Shader compilation failed';gl.deleteShader(shader);return null;}
    return shader;
  };
  const shaders=[compile(gl.VERTEX_SHADER,vertex),compile(gl.FRAGMENT_SHADER,fragment)];
  if(!shaders[0]||!shaders[1]){root.dataset.editionRenderer='css';gl.getExtension('WEBGL_lose_context')?.loseContext();return {destroy(){}};}
  const program=gl.createProgram()!;
  gl.attachShader(program,shaders[0]);gl.attachShader(program,shaders[1]);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){root.dataset.editionRenderer='css';root.dataset.editionError=gl.getProgramInfoLog(program)??'Shader link failed';gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();return {destroy(){}};}
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const uniforms=Object.fromEntries(['art','finish','enhancement','time','glass','pointer'].map(name=>[name,gl.getUniformLocation(program,name)]));
  gl.uniform1i(uniforms.art,0);gl.viewport(0,0,142,190);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  root.dataset.editionRenderer='webgl';
  let entries:Entry[]=[],dirty=true,previous=0,phase=1.4;
  const textures=new Map<string,WebGLTexture>();
  function collect(){
    entries=[];
    root.querySelectorAll<HTMLElement>('.card-surface.foil,.card-surface.holographic,.card-surface.polychrome,.card-surface.negative').forEach(surface=>{
      const enhancement=surface.closest<HTMLElement>('.modifier-print')?.dataset.enhancement??'none';
      const glass=enhancement==='glass';
      const image=surface.querySelector<HTMLImageElement>(glass?'.glass-base-ink':':scope>.pixel-art');
      if(!image)return;
      let canvas=surface.querySelector<HTMLCanvasElement>(':scope>.edition-canvas');
      if(!canvas){canvas=document.createElement('canvas');canvas.className='edition-canvas';canvas.width=142;canvas.height=190;canvas.setAttribute('aria-hidden','true');surface.querySelector(':scope>.modifier-seal')?surface.insertBefore(canvas,surface.querySelector(':scope>.modifier-seal')):surface.append(canvas);}
      const context=canvas.getContext('2d')!;context.imageSmoothingEnabled=false;
      entries.push({surface,canvas,context,image,texture:null,enhancement:Math.max(0,enhancements.indexOf(enhancement)),glass});
    });
    dirty=false;
  }
  const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='childList'))dirty=true;});
  observer.observe(root,{childList:true,subtree:true});
  let lost=false,disposed=false,raf=0;
  gpu.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;root.dataset.editionRenderer='css';root.querySelectorAll('.edition-ready').forEach(el=>el.classList.remove('edition-ready'));});
  function frame(now:number){
    if(disposed)return;
    raf=requestAnimationFrame(frame);
    if(lost||now-previous<33||document.hidden)return;
    const elapsed=Math.min(.1,(now-(previous||now))/1000);previous=now;
    if(!isReduced())phase+=elapsed;
    if(dirty)collect();
    for(const entry of entries){
      const {surface,canvas,context,image}=entry;
      if(!surface.isConnected||!image.complete||!image.naturalWidth)continue;
      if(!entry.texture){
        let texture=textures.get(image.src);
        if(!texture){texture=gl!.createTexture()!;gl!.bindTexture(gl!.TEXTURE_2D,texture);gl!.texParameteri(gl!.TEXTURE_2D,gl!.TEXTURE_MIN_FILTER,gl!.NEAREST);gl!.texParameteri(gl!.TEXTURE_2D,gl!.TEXTURE_MAG_FILTER,gl!.NEAREST);gl!.texParameteri(gl!.TEXTURE_2D,gl!.TEXTURE_WRAP_S,gl!.CLAMP_TO_EDGE);gl!.texParameteri(gl!.TEXTURE_2D,gl!.TEXTURE_WRAP_T,gl!.CLAMP_TO_EDGE);try{gl!.texImage2D(gl!.TEXTURE_2D,0,gl!.RGBA,gl!.RGBA,gl!.UNSIGNED_BYTE,image);}catch{gl!.deleteTexture(texture);continue;}textures.set(image.src,texture);}
        entry.texture=texture;
      }
      const style=getComputedStyle(surface),reduced=isReduced();
      gl!.bindTexture(gl!.TEXTURE_2D,entry.texture);
      gl!.uniform1f(uniforms.finish,finishes.findIndex(name=>surface.classList.contains(name))+1);
      gl!.uniform1f(uniforms.enhancement,entry.enhancement);gl!.uniform1f(uniforms.glass,entry.glass?1:0);
      gl!.uniform1f(uniforms.time,phase);
      gl!.uniform2f(uniforms.pointer,reduced?0:parseFloat(style.getPropertyValue('--sx'))||0,reduced?0:parseFloat(style.getPropertyValue('--sy'))||0);
      gl!.drawArrays(gl!.TRIANGLES,0,6);
      context.clearRect(0,0,142,190);context.drawImage(gpu,0,0);
      if(!surface.classList.contains('edition-ready'))surface.classList.add('edition-ready');
      canvas.dataset.finish=finishes.find(name=>surface.classList.contains(name));
    }
  }
  raf=requestAnimationFrame(frame);
  return {destroy(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();textures.forEach(t=>gl.deleteTexture(t));textures.clear();entries=[];gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));gl.getExtension('WEBGL_lose_context')?.loseContext();}};
}
