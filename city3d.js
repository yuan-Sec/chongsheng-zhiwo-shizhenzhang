/* Local, dependency-free orthographic 3D renderer. World-space meshes share the simulation grid. */
(function(root){
'use strict';
const colors={service:'#d4c99f',home:'#e3cbb0',shop:'#e6b56c',factory:'#869299',school:'#e5dcbb',clinic:'#d9e7e6',hall:'#eadfcd',park:'#438966',power:'#818c9d',water:'#68a7ba',tech:'#9cacbf'};
function shade(hex,k){return '#'+hex.slice(1).match(/../g).map(v=>Math.round(Math.min(255,parseInt(v,16)*k)).toString(16).padStart(2,'0')).join('');}
class City3D{
 constructor(host,onSelect){
  this.host=host;this.onSelect=onSelect;this.reset();
  host.innerHTML='<div class="camera-controls"><button data-camera="left" aria-label="向左旋转">↶</button><button data-camera="right" aria-label="向右旋转">↷</button><button data-camera="in" aria-label="放大">＋</button><button data-camera="out" aria-label="缩小">−</button><button data-camera="reset">全景复位</button><span>拖动旋转 · 滚轮缩放 · Shift 拖动平移</span></div><canvas tabindex="0" aria-label="三维城市地图，可拖动旋转；精确键盘建设请切换平面视图"></canvas><div class="scene-caption">立体城市 · 点击地块查看或建设</div>';
  this.canvas=host.querySelector('canvas');this.ctx=this.canvas.getContext('2d');
  host.querySelector('.camera-controls').onclick=e=>{const a=e.target.dataset.camera;if(!a)return;if(a==='reset')this.reset();else if(a==='left')this.yaw-=Math.PI/8;else if(a==='right')this.yaw+=Math.PI/8;else this.zoom=Math.max(.55,Math.min(5,this.zoom*(a==='in'?1.2:1/1.2)));this.draw();};
  this.canvas.onpointerdown=e=>{this.drag={x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY,moved:false};this.canvas.setPointerCapture(e.pointerId);};
  this.canvas.onpointermove=e=>{const d=this.drag;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(e.clientX-d.ox,e.clientY-d.oy)>5)d.moved=true;if(d.moved){if(e.shiftKey){this.panX+=dx;this.panY+=dy;}else{this.yaw+=dx*.008;this.pitch=Math.max(.35,Math.min(1.25,this.pitch+dy*.006));}this.draw();}d.x=e.clientX;d.y=e.clientY;};
  this.canvas.onpointerup=e=>{const d=this.drag;this.drag=null;if(d&&!d.moved){const r=this.canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;for(let k=this.faces.length-1;k>=0;k--){const f=this.faces[k];if(this.inside(x,y,f.points)){this.onSelect(f.cell);break;}}}};
  this.canvas.onpointercancel=()=>this.drag=null;
  this.canvas.onwheel=e=>{e.preventDefault();this.zoom=Math.max(.55,Math.min(5,this.zoom*Math.exp(-e.deltaY*.001)));this.draw();};
  this.canvas.addEventListener('wheel',this.canvas.onwheel,{passive:false});this.canvas.onwheel=null;
  this.canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')this.reset();if(e.key==='ArrowLeft')this.yaw-=.15;if(e.key==='ArrowRight')this.yaw+=.15;if(e.key==='ArrowUp')this.pitch=Math.min(1.25,this.pitch+.1);if(e.key==='ArrowDown')this.pitch=Math.max(.35,this.pitch-.1);if(e.key==='+')this.zoom=Math.min(5,this.zoom*1.2);if(e.key==='-')this.zoom=Math.max(.55,this.zoom/1.2);this.draw();}};
  new ResizeObserver(()=>this.draw()).observe(host);
 }
 reset(){this.yaw=-.65;this.pitch=.75;this.zoom=1;this.panX=0;this.panY=0;}
 render(state,selected,layer){this.state=state;this.selected=selected;this.layer=layer;this.draw();}
 project(x,y,z){const s=this.state,X=x-s.width/2,Y=y-s.height/2,c=Math.cos(this.yaw),n=Math.sin(this.yaw),a=X*c-Y*n,b=X*n+Y*c;return [this.w/2+a*this.scale+this.panX,this.h*.48+(b*Math.sin(this.pitch)-z*Math.cos(this.pitch))*this.scale+this.panY,b*Math.cos(this.pitch)+z*Math.sin(this.pitch)];}
 face(vertices,color,cell,stroke){const p=vertices.map(v=>this.project(...v));this.faces.push({points:p,color,cell,stroke,depth:p.reduce((n,v)=>n+v[2],0)/p.length});}
 box(x,y,z,w,d,h,color,cell){const a=[x,y,z],b=[x+w,y,z],c=[x+w,y+d,z],e=[x,y+d,z],A=[x,y,z+h],B=[x+w,y,z+h],C=[x+w,y+d,z+h],E=[x,y+d,z+h];this.face([a,b,B,A],shade(color,.74),cell);this.face([b,c,C,B],shade(color,.84),cell);this.face([c,e,E,C],shade(color,.68),cell);this.face([e,a,A,E],shade(color,.92),cell);this.face([A,B,C,E],color,cell);}
 inside(x,y,p){let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){if((p[i][1]>y)!==(p[j][1]>y)&&x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0])hit=!hit;}return hit;}
 draw(){
  if(!this.state||this.host.hidden||!this.host.clientWidth)return;
  const s=this.state,c=this.canvas,ctx=this.ctx;this.w=this.host.clientWidth;this.h=Math.max(340,Math.min(620,innerHeight*.56));const dpr=Math.min(devicePixelRatio||1,2);c.width=Math.round(this.w*dpr);c.height=Math.round(this.h*dpr);c.style.height=this.h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
  const bg=ctx.createLinearGradient(0,0,0,this.h);bg.addColorStop(0,'#d8e7e5');bg.addColorStop(1,'#eff0df');ctx.fillStyle=bg;ctx.fillRect(0,0,this.w,this.h);
  const co=Math.abs(Math.cos(this.yaw)),si=Math.abs(Math.sin(this.yaw));this.scale=Math.min((this.w-32)/(s.width*co+s.height*si),(this.h-75)/((s.width*si+s.height*co)*Math.sin(this.pitch)+2))*this.zoom;this.faces=[];
  const linked=Game.metrics(s).linked,proposed=new Set([...s.projects,...s.civic.parcels.filter(p=>p.status!=='sold'),...s.civic.promises.filter(p=>p.status==='active')].map(p=>p.cell));
  s.cells.forEach((cell,i)=>{
   const x=i%s.width,y=Math.floor(i/s.width),t=cell.type;let ground=t==='river'?'#76b6c5':t==='road'?'#747c7d':(x+y)%2?'#aac49b':'#b4cda5';if(this.selected===i)ground='#e5b15f';
   this.face([[x,y,0],[x+1,y,0],[x+1,y+1,0],[x,y+1,0]],ground,i,'#91ab96');
   if(t==='river'){this.face([[x+.2,y+.35,.01],[x+.7,y+.35,.01],[x+.7,y+.38,.01],[x+.2,y+.38,.01]],'#b5d9de',i);return;}
   if(t==='road'){this.box(x+.42,y+.12,.01,.06,.3,.01,this.layer==='roads'&&linked.has(i)?'#b9eeca':'#e0d9b9',i);return;}
   if(t==='empty'){if(proposed.has(i))this.box(x+.2,y+.2,.01,.6,.6,.06,'#d9ac68',i);return;}
   let col=colors[t]||'#ddd5bb';if(cell.wait)col='#c7b58d';if(this.layer==='services'&&!['school','clinic','water','power','hall'].includes(t))col='#aab5ac';
   if(t==='park'){this.box(x+.1,y+.1,0,.8,.8,.07,'#749858',i);for(const [dx,dy] of [[.3,.3],[.68,.65]]){this.box(x+dx-.035,y+dy-.035,.07,.07,.07,.3,'#8c7053',i);this.box(x+dx-.13,y+dy-.13,.27,.26,.26,.33,'#448769',i);}return;}
   const height={home:.55,shop:.42,factory:.42,hall:.65,school:.4,clinic:.72,power:.45,water:.25,tech:1.15}[t]||.5;
   this.box(x+.16,y+.16,.02,.68,.68,height,col,i);
   this.box(x+.13,y+.13,height+.02,.74,.74,.09,['home','hall'].includes(t)?'#b5755b':'#627e86',i);
   if(t==='factory'||t==='power')this.box(x+.63,y+.23,height+.1,.12,.12,.55,'#69717a',i);
   if(t==='water'){this.box(x+.22,y+.22,height+.12,.56,.56,.04,'#60b5d1',i);}
   if(t==='clinic'){this.box(x+.44,y+.24,height+.12,.12,.48,.025,'#ba665e',i);this.box(x+.26,y+.42,height+.12,.48,.12,.025,'#ba665e',i);}
   if(t==='school')this.box(x+.3,y+.35,height+.12,.4,.3,.12,'#e4c38d',i);
   if(t==='tech')this.box(x+.23,y+.23,height+.12,.35,.4,.38,'#bdd5d9',i);
   // Thin cuboids form windows on both long sides, so rotating exposes real surfaces.
   for(const dx of [.27,.52])for(let z=.19;z<height-.04;z+=.25){this.box(x+dx,y+.15,z,.12,.012,.11,'#547480',i);this.box(x+dx,y+.84,z,.12,.012,.11,'#547480',i);}
   if(cell.wait)this.box(x+.08,y+.08,.03,.08,.08,height+.45,'#d6a443',i);
   if(this.selected===i)this.box(x+.05,y+.05,.02,.1,.1,.18,'#e09a37',i);
  });
  this.faces.sort((a,b)=>a.depth-b.depth);
  for(const f of this.faces){ctx.beginPath();f.points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=f.color;ctx.fill();if(f.stroke){ctx.strokeStyle=f.stroke;ctx.lineWidth=.4;ctx.stroke();}}
  ctx.fillStyle='#37574e';ctx.font='12px Microsoft YaHei';ctx.fillText(s.width+' × '+s.height+' · '+Math.round(this.zoom*100)+'%',14,this.h-16);
 }
}
root.City3D=City3D;
})(globalThis);
