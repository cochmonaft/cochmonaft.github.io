import * as THREE from './assets/three.module.js';
const $=id=>document.getElementById(id), canvas=$('scene'), main=$('experience');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let mode=location.pathname.includes('ruslan')?'bar':'milk',state='idle',progress=0,target=0,rotation=.24,tilt=-.04,lastInteraction=performance.now(),drag=null,sequence=0;
let pickup=0,pickupStart=null,activePaper=null,fold=0,extraction=0,lastFrame=performance.now(),returning=0,returnStart=null,hasBeenOpened=false;
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});}catch(e){$('loading').textContent='3D недоступно в этом браузере.';$('fallback').hidden=false;renderer=null;}
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,50);
if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;}
scene.add(new THREE.HemisphereLight(0xfffbeb,0x706755,2.7));
const key=new THREE.DirectionalLight(0xffefd3,3.1);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=6;key.shadow.camera.bottom=-5;key.shadow.normalBias=.035;scene.add(key);
const fill=new THREE.DirectionalLight(0xffffff,1.1);fill.position.set(4,2,-3);scene.add(fill);
function texture(painter,w=768,h=1536){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');painter(ctx,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer?Math.min(renderer.capabilities.getMaxAnisotropy(),8):1;return t;}
function base(ctx,w,h){ctx.fillStyle='#e9d8ad';ctx.fillRect(0,0,w,h);let seed=23;for(let i=0;i<13000;i++){seed=(seed*16807)%2147483647;let x=seed%w;seed=(seed*16807)%2147483647;let y=seed%h;ctx.fillStyle=i%2?'#9982500b':'#ffffff22';ctx.fillRect(x,y,2,2);}ctx.strokeStyle='#927e4830';ctx.lineWidth=5;ctx.strokeRect(12,12,w-24,h-24);}
function text(ctx,str,x,y,size=40,color='#253e2a',font='Georgia',align='center'){ctx.textAlign=align;ctx.fillStyle=color;ctx.font=`${size}px ${font}`;ctx.fillText(str,x,y);}
const front=texture((c,w,h)=>{base(c,w,h);c.fillStyle='#20533a';c.fillRect(w*.21,0,w*.58,385);text(c,'ОСОБЕННАЯ',w/2,140,36,'#f2e4bd','Arial');text(c,'партия',w/2,215,67,'#f2e4bd');text(c,'СДЕЛАНО ДЛЯ ТЕБЯ',w/2,302,25,'#f2e4bd','Arial');text(c,'Я',w/2,785,360);text(c,'ТА САМАЯ',w/2,900,42,undefined,'Arial');text(c,'100%',w/2,1135,124,'#bb4336');text(c,'любви',w/2,1200,52);c.fillStyle='#20533a';c.fillRect(0,1310,w,226);text(c,'СРОК ГОДНОСТИ',w/2,1380,29,'#f2e4bd','Arial');text(c,'ВЕЧНОСТЬ',w/2,1460,64,'#f2e4bd');});
const back=texture((c,w,h)=>{base(c,w,h);c.fillStyle='#20533a';c.fillRect(0,0,w,175);text(c,'О ТОМ, ЧТО ВНУТРИ',w/2,112,44,'#f2e4bd','Arial');text(c,'Состав',w/2,342,80);['Любовь.','Воспоминания.','Поддержка.','Немного магии.'].forEach((t,i)=>text(c,t,w/2,460+i*94,46));c.strokeStyle='#20533a';c.lineWidth=2;c.beginPath();c.moveTo(90,885);c.lineTo(w-90,885);c.stroke();text(c,'ХРАНИТЬ',w/2,1000,38,undefined,'Arial');text(c,'рядом с сердцем',w/2,1073,52);text(c,'Не содержит случайностей.',w/2,1200,31,undefined,'Arial');text(c,'Внутри — письмо.',w/2,1300,40);text(c,'ПАРТИЯ 01 / 01',w/2,1390,30,undefined,'Arial');});
const side1=texture((c,w,h)=>{base(c,w,h);text(c,'ПИЩЕВАЯ',w/2,195,38,undefined,'Arial');text(c,'ЦЕННОСТЬ',w/2,254,38,undefined,'Arial');[['Объятия','∞'],['Воспоминания','100%'],['Тепло','100%']].forEach((a,i)=>{text(c,a[0],w/2,430+i*240,34,undefined,'Arial');text(c,a[1],w/2,545+i*240,91,'#bb4336');});text(c,'ДЛЯ «Я»',w/2,1320,54);text(c,'И НИ ДЛЯ КОГО БОЛЬШЕ',w/2,1400,22,undefined,'Arial');},512,1536);
const side2=texture((c,w,h)=>{base(c,w,h);text(c,'ОСОБЫЙ',w/2,245,45,undefined,'Arial');text(c,'СЛУЧАЙ',w/2,310,45,undefined,'Arial');text(c,'1',w/2,650,190,'#bb4336');text(c,'письмо внутри',w/2,730,43);text(c,'ОДИН ЭКЗЕМПЛЯР',w/2,1030,30,undefined,'Arial');text(c,'для тебя',w/2,1100,46);c.fillStyle='#20533a';for(let i=0;i<38;i++){if(i%3!==1)c.fillRect(95+i*8,1260,i%2?3:6,110);}text(c,'Я  —  ОСОБЕННАЯ ПАРТИЯ',w/2,1430,23,undefined,'Arial');},512,1536);
const mat=t=>new THREE.MeshStandardMaterial({map:t,roughness:.9});
const milk=new THREE.Group();scene.add(milk);
const carton=new THREE.Group();milk.add(carton);
const paperInside=new THREE.MeshStandardMaterial({color:0xeee4ce,roughness:1,side:THREE.DoubleSide});
const cutCard=new THREE.MeshStandardMaterial({color:0xe7d9ba,roughness:1});
const body=new THREE.Group();carton.add(body);
function block(w,h,d,materials,x,y,z,parent=body){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),materials);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
// A single closed shell with an open mouth. Every edge belongs to exactly two faces.
function solidFromQuads(quads,materials){const positions=[],uv=[],groups=[];for(const [points,material,faceUV] of quads){const start=positions.length/3;for(const i of [0,1,2,0,2,3]){positions.push(...points[i]);uv.push(...(faceUV??[[0,0],[1,0],[1,1],[0,1]])[i]);}groups.push([start,6,material]);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));for(const a of groups)g.addGroup(...a);g.computeVertexNormals();return new THREE.Mesh(g,materials);}
const shellFaces=[],face=(points,m)=>shellFaces.push([points,m]),reverse=p=>[...p].reverse();
const ox=.75,oz=.575,ix=.726,iz=.551,low=-1.525,floor=-1.497,rim=1.525;
const outer=[
 [[-ox,low,oz],[ox,low,oz],[ox,rim,oz],[-ox,rim,oz]],
 [[ox,low,-oz],[-ox,low,-oz],[-ox,rim,-oz],[ox,rim,-oz]],
 [[ox,low,oz],[ox,low,-oz],[ox,rim,-oz],[ox,rim,oz]],
 [[-ox,low,-oz],[-ox,low,oz],[-ox,rim,oz],[-ox,rim,-oz]]
];
outer.forEach((p,i)=>face(p,i));
const inner=[
 [[-ix,floor,iz],[ix,floor,iz],[ix,rim,iz],[-ix,rim,iz]],
 [[ix,floor,-iz],[-ix,floor,-iz],[-ix,rim,-iz],[ix,rim,-iz]],
 [[ix,floor,iz],[ix,floor,-iz],[ix,rim,-iz],[ix,rim,iz]],
 [[-ix,floor,-iz],[-ix,floor,iz],[-ix,rim,iz],[-ix,rim,-iz]]
];
inner.forEach(p=>face(reverse(p),4));
for(let i=0;i<4;i++)face([outer[i][3],outer[i][2],inner[i][2],inner[i][3]],5);
face([[-ox,low,-oz],[ox,low,-oz],[ox,low,oz],[-ox,low,oz]],5);
face([[-ix,floor,iz],[ix,floor,iz],[ix,floor,-iz],[-ix,floor,-iz]],4);
const shell=solidFromQuads(shellFaces,[mat(front),mat(back),mat(side1),mat(side2),paperInside,cutCard]);shell.castShadow=true;shell.receiveShadow=true;body.add(shell);
const fibreMap=texture((c,w,h)=>{c.fillStyle='#aaa';c.fillRect(0,0,w,h);let seed=51;for(let i=0;i<9000;i++){seed=(seed*16807)%2147483647;c.fillStyle=i%3?'#939393':'#ccc';c.fillRect(seed%w,(seed>>8)%h,1,2);}},256,256);
for(const o of body.children){for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(m.map){m.bumpMap=fibreMap;m.bumpScale=.004;m.roughness=.88;}}}
function crease(points,parent=carton,opacity=.22){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const line=new THREE.Line(g,new THREE.LineBasicMaterial({color:0x7c7357,transparent:true,opacity}));parent.add(line);return line;}
const roofPrint=texture((c,w,h)=>{base(c,w,h);c.fillStyle='#20533a';c.fillRect(0,0,w,95);},1024,320);
const roofMaterial=new THREE.MeshStandardMaterial({map:roofPrint,roughness:1,side:THREE.FrontSide});
const roofFront=new THREE.Group();roofFront.position.set(0,1.525,.575);carton.add(roofFront);
const roofBack=new THREE.Group();roofBack.position.set(0,1.525,-.575);carton.add(roofBack);
const slope=Math.atan2(.575,.5),roofLength=Math.hypot(.5,.575),boardThickness=.018;
// Each slope and its sealed ridge form one watertight solid, without overlapping parts.
const roofPanels=[],ridgeMaterial=new THREE.MeshStandardMaterial({color:0x20533a,roughness:1});
for(const [parent,frontSide] of [[roofFront,true],[roofBack,false]]){
 const sign=frontSide?1:-1,qs=[],add=(points,material,uv)=>qs.push([frontSide?points:reverse(points),material,uv?(frontSide?uv:reverse(uv)):undefined]);
 for(let i=0;i<30;i++){
  const x0=-.75+i*.05,x1=-.75+(i+1)*.05,y0=.601+Math.sin(i*2.7)*.006,y1=.601+Math.sin((i+1)*2.7)*.006;
  const outside=[[x0,0,0],[x1,0,0],[x1,.5,-sign*.563],[x0,.5,-sign*.563]];
  const inside=[[x0,0,-sign*.024],[x1,0,-sign*.024],[x1,.5,-sign*.575],[x0,.5,-sign*.575]];
  const crest=[outside[3],outside[2],[x1,y1,-sign*.563],[x0,y0,-sign*.563]];
  const lining=[inside[3],inside[2],[x1,y1,-sign*.575],[x0,y0,-sign*.575]];
  add(outside,0,[[i/30,0],[(i+1)/30,0],[(i+1)/30,1],[i/30,1]]);add(reverse(inside),1);add(crest,3);add(reverse(lining),3);
  add([outside[1],outside[0],inside[0],inside[1]],2);
  add([crest[3],crest[2],lining[2],lining[3]],2);
  if(i===0){add([outside[0],outside[3],inside[3],inside[0]],2);add([crest[0],crest[3],lining[3],lining[0]],2);}
  if(i===29){add([outside[2],outside[1],inside[1],inside[2]],2);add([crest[2],crest[1],lining[1],lining[2]],2);}
 }
 const panel=solidFromQuads(qs,[roofMaterial,paperInside,cutCard,ridgeMaterial]);panel.castShadow=true;parent.add(panel);roofPanels.push(panel);
}
const fringes=[];
for(const [parent,frontSide] of [[roofFront,true],[roofBack,false]]){
 for(let i=0;i<30;i++){
  const x=-.75+(i+.5)*.05,s=new THREE.Shape();s.moveTo(-.024,0);s.lineTo(-.024,.010);s.lineTo(-.012,.019+(i%3)*.003);s.lineTo(0,.012);s.lineTo(.012,.022-(i%4)*.002);s.lineTo(.024,.009);s.lineTo(.024,0);s.closePath();
  const edge=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:.010,bevelEnabled:false}),new THREE.MeshStandardMaterial({color:0xf0e6ce,roughness:1}));
  // Torn fibres sit outside each ridge, so their faces cannot compete for depth.
  edge.position.set(x,.599+Math.sin(i*2.7)*.006,frontSide?-.562:.552);parent.add(edge);edge.visible=false;fringes.push({edge,i});
 }
}
const tornShape=new THREE.Shape();tornShape.moveTo(-.13,0);tornShape.lineTo(-.15,.09);tornShape.lineTo(-.065,.13);tornShape.lineTo(-.03,.19);tornShape.lineTo(.04,.15);tornShape.lineTo(.11,.19);tornShape.lineTo(.14,.10);tornShape.lineTo(.10,-.025);tornShape.lineTo(.02,-.04);tornShape.closePath();
const tearTab=new THREE.Group();tearTab.position.set(-.68,.55,-.50);tearTab.rotation.set(.45,0,-.16);roofFront.add(tearTab);
const tornEdge=new THREE.Mesh(new THREE.ExtrudeGeometry(tornShape,{depth:.017,bevelEnabled:false}),[new THREE.MeshStandardMaterial({color:0x20533a,roughness:.94}),cutCard]);tearTab.add(tornEdge);tornEdge.castShadow=true;
const exposedEdge=new THREE.Mesh(new THREE.ShapeGeometry(tornShape),paperInside);exposedEdge.scale.set(1.12,1.12,1);exposedEdge.position.z=-.003;tearTab.add(exposedEdge);
const sideFlaps=[];
for(const sign of [-1,1]){
 const g=new THREE.Group();g.position.set(sign*.75,1.525,0);carton.add(g);
 const outside=[[0,0,-.575],[0,0,.575],[0,.5,.012],[0,.5,-.012]],inside=outside.map(([x,y,z])=>[-sign*.024,y,z]);
 const qs=[[sign===1?reverse(outside):outside,0],[sign===1?inside:reverse(inside),1]];
 for(let i=0;i<4;i++){const j=(i+1)%4,points=[outside[j],outside[i],inside[i],inside[j]];qs.push([sign===1?reverse(points):points,2]);}
 const face=solidFromQuads(qs,[cutCard,paperInside,cutCard]);face.castShadow=true;g.add(face);sideFlaps.push({group:g,sign});
}
const cap=new THREE.Group();
const capNormal=new THREE.Vector3(0,.563,.5).normalize(),capSurface=new THREE.Vector3(.26,.22,-.24772);
// The lowest ring rests on the OUTSIDE of the board; the lid cannot poke inside.
cap.position.copy(capSurface).addScaledVector(capNormal,.088);cap.rotation.x=Math.atan2(.5,.563);roofFront.add(cap);
const lid=new THREE.Mesh(new THREE.CylinderGeometry(.218,.225,.117,48),new THREE.MeshStandardMaterial({color:0x225438,roughness:.7}));cap.add(lid);lid.castShadow=true;
for(let i=0;i<40;i++){const rib=new THREE.Mesh(new THREE.BoxGeometry(.009,.105,.014),lid.material);rib.position.set(Math.cos(i*Math.PI/20)*.223,0,Math.sin(i*Math.PI/20)*.223);rib.rotation.y=-i*Math.PI/20;cap.add(rib);}
const sealRing=new THREE.Mesh(new THREE.CylinderGeometry(.232,.233,.042,48),lid.material);sealRing.position.y=-.065;cap.add(sealRing);
let lastCartonProgress=-1;
function updateCarton(p){
 if(p===lastCartonProgress)return;lastCartonProgress=p;
 const rip=THREE.MathUtils.smoothstep(p,0,.78),open=THREE.MathUtils.smoothstep(p,.70,1),peel=THREE.MathUtils.smoothstep(p,.04,.78)*.18;
 roofFront.rotation.x=peel+open*2.60;roofBack.rotation.x=-peel*.42-open*2.61;
 for(const {group,sign} of sideFlaps)group.rotation.z=-sign*open*(sign===1?1.87:1.92);
 for(const {edge,i} of fringes)edge.visible=hasBeenOpened||rip>(i+.3)/30;
 tearTab.rotation.set(.45+rip*.45,0,-.16-rip*.22);tearTab.position.z=-.50+rip*.03;
}

function paperTexture(name,part){return texture((c,w,h)=>{c.fillStyle='#f4ead6';c.fillRect(0,0,w,h);c.strokeStyle='#aa997732';c.lineWidth=2;c.beginPath();c.moveTo(0,h-2);c.lineTo(w,h-2);c.stroke();if(part===0){text(c,name,w/2,h*.49,75,'#5c5345');text(c,'ЛИЧНОЕ ПИСЬМО',w/2,h*.70,20,'#9d907b','Arial');}else{for(let i=0;i<5;i++){c.strokeStyle='#75665050';c.lineWidth=3;c.beginPath();c.moveTo(115,100+i*48);c.lineTo(w-115-(i%3)*55,100+i*48);c.stroke();}}},1024,630);}
function foldedPaper(name){const g=new THREE.Group(),paperMat=part=>new THREE.MeshStandardMaterial({map:paperTexture(name,part),roughness:1,side:THREE.DoubleSide});const middle=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.86),paperMat(1));middle.castShadow=true;g.add(middle);const top=new THREE.Group();top.position.set(0,.43,.008);g.add(top);const upper=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.86),paperMat(1));upper.position.y=.43;upper.castShadow=true;top.add(upper);const bottom=new THREE.Group();bottom.position.set(0,-.43,.014);g.add(bottom);const lower=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.86),paperMat(2));lower.position.y=-.43;lower.castShadow=true;bottom.add(lower);top.rotation.x=-Math.PI;bottom.rotation.x=Math.PI;const cover=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.86),paperMat(0));cover.position.z=.024;g.add(cover);g.userData={top,bottom,cover};return g;}
const milkLetter=foldedPaper('Я,');milkLetter.scale.setScalar(.72);milkLetter.visible=false;carton.add(milkLetter);
const barLetter=foldedPaper('Руслану');barLetter.visible=false;scene.add(barLetter);
const shadowTexture=texture((c,w,h)=>{const gradient=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gradient.addColorStop(0,'#312a2070');gradient.addColorStop(.5,'#312a2030');gradient.addColorStop(1,'#312a2000');c.fillStyle=gradient;c.fillRect(0,0,w,h);},256,256);
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(4,3),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-1.64;milk.add(shadow);

const rays=new THREE.Raycaster(),pointer=new THREE.Vector2(),worldPoint=new THREE.Vector3();
function resize(){const w=main.clientWidth,h=main.clientHeight;camera.aspect=w/h;camera.position.set(0,.1,8.3);camera.lookAt(0,0,0);camera.updateProjectionMatrix();renderer?.setSize(w,h,false);milk.position.set(0,-.32,0);milk.scale.setScalar(Math.min(.90,w/420*.9));if(state!=='pickup'&&state!=='reading')barLetter.scale.setScalar(1.27);}
window.addEventListener('resize',resize);resize();
function switchScene(next){sequence++;mode=next;state=mode==='milk'?'idle':'served';progress=target=pickup=fold=extraction=0;pickupStart=null;activePaper=null;rotation=.24;tilt=-.04;drag=null;lastInteraction=performance.now();main.className=mode==='milk'?'milk':'bar';renderer&&(renderer.toneMappingExposure=mode==='milk'?1.3:.95);milk.visible=mode==='milk';if(milkLetter.parent!==carton)carton.add(milkLetter);milkLetter.visible=false;milkLetter.position.set(0,.84,0);milkLetter.rotation.set(0,0,0);milkLetter.scale.setScalar(.72);updateCarton(0);milkLetter.userData.cover.visible=true;milkLetter.userData.top.visible=milkLetter.userData.bottom.visible=false;milkLetter.userData.top.rotation.x=-Math.PI;milkLetter.userData.bottom.rotation.x=Math.PI;barLetter.visible=mode==='bar';barLetter.userData.cover.visible=true;barLetter.userData.top.rotation.x=-Math.PI;barLetter.userData.bottom.rotation.x=Math.PI;$('subtitle').classList.toggle('visible',mode==='bar');$('subtitle').textContent=mode==='bar'?'Это вам, Руслан.':'';$('tear-hit').hidden=mode!=='milk';$('paper-hit').hidden=mode!=='bar';$('stage').setAttribute('aria-label',mode==='milk'?'Коробка для Я':'Бар Ruslan C');document.title=mode==='milk'?'Для Я — письмо внутри':'Ruslan C — письмо Руслану';if($('letter').open)$('letter').close();resize();}
function showReading(){state='reading';$('letter-title').textContent=mode==='milk'?'Я,':'Руслан,';$('letter-content').innerHTML=mode==='milk'?'<p>Здесь будет твоё письмо.</p>':'<p>Это вам.</p><p>Здесь будет твоё настоящее письмо.</p>';$('subtitle').classList.remove('visible');if(!$('letter').open)$('letter').showModal();}
function takePaper(){if(state==='pickup'||state==='reading')return;if(mode==='milk'&&state!=='ready')return;activePaper=mode==='milk'?milkLetter:barLetter;scene.attach(activePaper);pickupStart={position:activePaper.position.clone(),rotation:activePaper.quaternion.clone(),scale:activePaper.scale.clone()};state='pickup';pickup=fold=0;$('paper-hit').hidden=true;$('tear-hit').hidden=true;$('subtitle').classList.remove('visible');}
$('close-letter').addEventListener('click',()=>$('letter').close());$('letter').addEventListener('click',e=>{if(e.target===$('letter')){const r=$('letter').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('letter').close();}});
$('letter').addEventListener('close',()=>{if(state==='reading'){state=renderer?'read':'idle';$('paper-hit').hidden=!renderer;$('paper-hit').setAttribute('aria-label','Сложить и убрать письмо в коробку');}});
function applyPaperFold(amount){fold=amount;milkLetter.userData.cover.visible=amount<.02;milkLetter.userData.top.visible=milkLetter.userData.bottom.visible=amount>.002;milkLetter.userData.top.rotation.x=-Math.PI*(1-amount);milkLetter.userData.bottom.rotation.x=Math.PI*(1-amount);}
function returnPaper(){if(state!=='read')return;state='returning';returning=0;returnStart={position:milkLetter.position.clone(),rotation:milkLetter.quaternion.clone(),scale:milkLetter.scale.clone()};$('paper-hit').hidden=true;}
function animateReturn(dt){
 returning=Math.min(1,returning+dt/(reduced?.25:3));
 const smooth=(a,b)=>THREE.MathUtils.smoothstep(returning,a,b),foldIn=smooth(0,.25),lift=smooth(.26,.55),across=smooth(.56,.75),inside=smooth(.76,1);
 applyPaperFold(1-foldIn);
 const above=carton.localToWorld(new THREE.Vector3(0,2.53,0)),up=new THREE.Vector3(0,Math.max(above.y,2.1),2.35),end=carton.localToWorld(new THREE.Vector3(0,.84,0));
 const packedScale=milk.scale.x*.72,orientation=carton.getWorldQuaternion(new THREE.Quaternion());
 milkLetter.position.lerpVectors(returnStart.position,up,lift);
 milkLetter.quaternion.slerpQuaternions(returnStart.rotation,new THREE.Quaternion(),lift);
 milkLetter.scale.lerpVectors(returnStart.scale,new THREE.Vector3(packedScale,packedScale,packedScale),lift);
 if(returning>.55){milkLetter.position.lerpVectors(up,above,across);milkLetter.quaternion.slerpQuaternions(new THREE.Quaternion(),orientation,across);}
 if(returning>.75)milkLetter.position.lerpVectors(above,end,inside);
 if(returning===1){carton.attach(milkLetter);milkLetter.position.set(0,.84,0);milkLetter.rotation.set(0,0,0);milkLetter.scale.setScalar(.72);milkLetter.visible=false;extraction=0;state='closing';target=0;activePaper=null;}
}
function completeOpening(){hasBeenOpened=true;state='opening';target=1;rotation=0;tilt=0;drag=null;main.classList.remove('grabbing');}
$('fallback').addEventListener('click',showReading);
function coords(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function pick(object,e){const p=coords(e);pointer.set(p.x/main.clientWidth*2-1,-p.y/main.clientHeight*2+1);rays.setFromCamera(pointer,camera);return rays.intersectObject(object,true).length>0;}
function begin(e,kind){if(!renderer)return;lastInteraction=performance.now();if(kind==='paper'){if(state==='read'){returnPaper();return;}takePaper();return;}if(mode==='bar'){if(state==='served'&&pick(barLetter,e))takePaper();return;}if(state==='read'){if(pick(milkLetter,e))returnPaper();return;}if(state==='ready'){if(pick(milkLetter,e))takePaper();return;}if(state!=='idle'&&state!=='tear')return;const tearing=kind==='tear'||pick(tearTab,e);drag={kind:tearing?'tear':'rotate',x:e.clientX,y:e.clientY,rot:rotation,tilt,progress};if(tearing){state='tear';main.classList.add('grabbing');}e.currentTarget.setPointerCapture(e.pointerId);}
canvas.addEventListener('pointerdown',e=>begin(e));$('tear-hit').addEventListener('pointerdown',e=>begin(e,'tear'));$('paper-hit').addEventListener('pointerdown',e=>begin(e,'paper'));
function move(e){if(!drag)return;if(drag.kind==='rotate'){rotation=drag.rot+(e.clientX-drag.x)*.009;tilt=Math.max(-.32,Math.min(.22,drag.tilt+(e.clientY-drag.y)*.002));}else{const distance=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);progress=Math.max(progress,Math.min(1,drag.progress+Math.max(0,distance-8)/150));target=progress;if(progress>=.93)completeOpening();}lastInteraction=performance.now();}
function end(e){if(!drag)return;const wasTear=drag.kind==='tear';drag=null;main.classList.remove('grabbing');if(wasTear&&state==='tear'){if(progress>.74)completeOpening();else{target=progress<.055?0:progress;state='idle';}}}
for(const el of [canvas,$('tear-hit')]){el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',()=>{if(drag?.kind==='tear'&&progress>.74)completeOpening();else{drag=null;target=progress<.055?0:progress;state=mode==='milk'?'idle':'served';}main.classList.remove('grabbing');});}
$('tear-hit').addEventListener('click',e=>{if(e.detail===0&&state==='idle')completeOpening();});$('paper-hit').addEventListener('click',e=>{if(e.detail===0){if(state==='read')returnPaper();else takePaper();}});
function projectButton(button,object,width=64,height=64){object.getWorldPosition(worldPoint);worldPoint.project(camera);const x=(worldPoint.x*.5+.5)*main.clientWidth,y=(-worldPoint.y*.5+.5)*main.clientHeight;button.style.left=x+'px';button.style.top=y+'px';button.style.width=width+'px';button.style.height=height+'px';}
function animate(){requestAnimationFrame(animate);if(!renderer)return;const now=performance.now(),dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;const ease=1-Math.exp(-6*dt);if(!drag)progress+=(target-progress)*(reduced?1:ease);if(mode==='milk'){carton.rotation.y=THREE.MathUtils.lerp(carton.rotation.y,rotation,.13);carton.rotation.x=THREE.MathUtils.lerp(carton.rotation.x,tilt,.13);carton.position.y=0;updateCarton(progress);const frame=THREE.MathUtils.smoothstep(progress,.6,1);camera.position.set(0,.1+frame*.36,8.3+frame*1.35);camera.lookAt(0,frame*.36,0);
 if(state==='opening'&&progress>.995){progress=target=1;state='extracting';extraction=0;$('tear-hit').hidden=true;}
 if(state==='extracting')extraction=Math.min(1,extraction+dt/(reduced?.12:2.15));
 if(milkLetter.parent===carton){
  const rise=THREE.MathUtils.smoothstep(extraction,0,.74),present=THREE.MathUtils.smoothstep(extraction,.78,1);
  // The whole folded sheet clears the rim BEFORE any forward displacement.
  milkLetter.position.set(0,.84+rise*1.69,present*.82);
  milkLetter.rotation.set(-.025*present,0,-.045*present);
 }
 milkLetter.visible=['extracting','ready','pickup','reading','read','returning'].includes(state);
 if(state==='extracting'&&extraction===1){state='ready';$('paper-hit').setAttribute('aria-label','Взять и раскрыть письмо');$('paper-hit').hidden=false;$('tear-hit').hidden=true;}
 if(state==='closing'&&progress<.005){progress=target=0;state='idle';$('tear-hit').hidden=false;}if(state==='idle'||state==='tear'){projectButton($('tear-hit'),tearTab,70,70);}}else if(state==='served'){barLetter.position.set(.05,-1.55,1.05);barLetter.rotation.set(-1.10,0,-.12);}
if(state==='pickup'){
 pickup=Math.min(1,pickup+dt/(reduced?.12:2.25));
 if(mode==='milk'){
  const out=THREE.MathUtils.smoothstep(pickup,0,.34),lower=THREE.MathUtils.smoothstep(pickup,.35,.70);
  const waypoint=new THREE.Vector3(0,Math.max(pickupStart.position.y,2.1),2.35);
  activePaper.position.lerpVectors(pickupStart.position,waypoint,out);
  if(pickup>.34)activePaper.position.lerpVectors(waypoint,new THREE.Vector3(0,.1,2.35),lower);
  activePaper.quaternion.slerpQuaternions(pickupStart.rotation,new THREE.Quaternion(),out);
  activePaper.scale.lerpVectors(pickupStart.scale,new THREE.Vector3(1.10,1.10,1.10),lower);
  fold=THREE.MathUtils.smoothstep(pickup,.72,1);
 }else{
  const t=pickup*pickup*(3-2*pickup);activePaper.position.lerpVectors(pickupStart.position,new THREE.Vector3(0,0,1.85),t);activePaper.quaternion.slerpQuaternions(pickupStart.rotation,new THREE.Quaternion(),t);activePaper.scale.lerpVectors(pickupStart.scale,new THREE.Vector3(1.15,1.15,1.15),t);fold=THREE.MathUtils.smoothstep(pickup,.30,.92);
 }
 activePaper.userData.cover.visible=fold<.02;activePaper.userData.top.visible=activePaper.userData.bottom.visible=fold>.002;activePaper.userData.top.rotation.x=-Math.PI*(1-fold);activePaper.userData.bottom.rotation.x=Math.PI*(1-fold);if(pickup===1)showReading();
}
if(state==='returning')animateReturn(dt);
main.dataset.state=state;main.dataset.tear=progress.toFixed(3);main.dataset.extraction=extraction.toFixed(3);
scene.updateMatrixWorld();if(!$('paper-hit').hidden){const paper=mode==='milk'?milkLetter:barLetter;projectButton($('paper-hit'),paper,Math.min(main.clientWidth*.72,310),['reading','read'].includes(state)?360:110);}renderer.render(scene,camera);}
switchScene(mode);if(renderer)$('loading').hidden=true;animate();
