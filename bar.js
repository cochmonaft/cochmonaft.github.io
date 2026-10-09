import * as THREE from './assets/three.module.js';
const assetUrl = name => new URL('./assets/' + name, import.meta.url).href;
const $ = id => document.getElementById(id);
const stage=$('bar-experience'), canvas=$('bar-canvas'), dialog=$('letter-dialog');
const music=new Audio(assetUrl('caravan-whiplash.mp3')); music.loop=true; music.preload='metadata';
let sound=true, session=0, state='loading', clock=0, activeSpeech=null, speechUntil=0;
let animations=[], waits=[];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=THREE.MathUtils.clamp, ease=t=>t*t*(3-2*t);
function setState(s){state=s;stage.dataset.state=s;}
function delay(ms){const ticket=session;return new Promise(resolve=>{const timer=setTimeout(()=>{waits=waits.filter(w=>w.timer!==timer);resolve(ticket===session)},ms);waits.push({timer,resolve});});}
function animate(seconds,apply){const ticket=session;return new Promise(resolve=>animations.push({start:clock,seconds:reduced?Math.min(seconds,.2):seconds,apply,resolve,ticket}));}
function caption(text,who='БАРМЕН'){if($('speaker').textContent!==who)$('speaker').textContent=who;if($('line').textContent!==text)$('line').textContent=text;$('caption').classList.add('visible');}
const VoiceContext=window.AudioContext||window.webkitAudioContext;
const voiceContext=VoiceContext?new VoiceContext():null;
const voiceGain=voiceContext?.createGain();if(voiceGain){voiceGain.gain.value=.95;voiceGain.connect(voiceContext.destination);}
// GainNode controls the background level on iPhone, where media.volume is fixed.
const musicGain=voiceContext?.createGain();let musicLevel=null;
if(musicGain){const source=voiceContext.createMediaElementSource(music);source.connect(musicGain);musicGain.connect(voiceContext.destination);musicGain.gain.value=0;}
function volume(){
 const level=['loading','awaiting-audio'].includes(state)?0:state==='reading'?.055:activeSpeech?.035:.13;
 if(level===musicLevel)return;musicLevel=level;
 if(musicGain){musicGain.gain.cancelScheduledValues(voiceContext.currentTime);musicGain.gain.setTargetAtTime(level,voiceContext.currentTime,.18);}else music.volume=level;
}
let voiceBuffer=null;
const voiceReady=voiceContext?fetch(assetUrl('bartender-kontorka.mp3')).then(r=>{if(!r.ok)throw Error('Voice unavailable');return r.arrayBuffer();}).then(b=>voiceContext.decodeAudioData(b)).then(b=>{voiceBuffer=b;}):Promise.resolve();
// Five bartender cues from the supplied recording.
const voiceCues={
 'Добрый вечер, Руслан.':[0,2.60],
 'Что будете?':[2.97,4.65],
 'Прошу.':[4.73,5.82],
 'И ещё кое-что.':[6.05,7.79],
 'Это вам, Руслан.':[7.80,9.456]
};
function stopVoice(){const source=activeSpeech;activeSpeech=null;if(source){try{source.stop();}catch{}}speechUntil=0;volume();}
function speak(text,who='БАРМЕН'){
 stopVoice();caption(text,who);
 const cue=who==='БАРМЕН'?voiceCues[text]:null,duration=cue?cue[1]-cue[0]:1.9;
 speechUntil=clock+duration;volume();
 if(sound&&cue&&voiceContext&&voiceBuffer){
  const source=voiceContext.createBufferSource();source.buffer=voiceBuffer;source.connect(voiceGain);activeSpeech=source;
  volume();
  source.onended=()=>{if(activeSpeech===source){activeSpeech=null;speechUntil=clock;volume();}source.disconnect();};
  source.start(0,cue[0],Math.min(duration,voiceBuffer.duration-cue[0]));
 }
 return delay(duration*1000+180);
}
function startMusic(){return music.play().catch(()=>{});}
document.addEventListener('visibilitychange',()=>{if(document.hidden){music.pause();}else if(!['loading','awaiting-audio'].includes(state)){voiceContext?.resume();startMusic();}});
const scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const camera=new THREE.PerspectiveCamera(34,1,.1,40);camera.position.set(0,.15,8.3);camera.lookAt(0,.15,0);
scene.add(new THREE.HemisphereLight(0xffebd2,0x492411,2.7));
const key=new THREE.DirectionalLight(0xffd7a0,4);key.position.set(-3,5,6);scene.add(key);
const fill=new THREE.DirectionalLight(0xc7dcff,1.2);fill.position.set(4,2,3);scene.add(fill);
function mesh(g,m,parent,pos=[0,0,0],scale=[1,1,1]){const o=new THREE.Mesh(g,m);o.position.set(...pos);o.scale.set(...scale);parent.add(o);return o;}
const textureLoader=new THREE.TextureLoader();
// Photographic objects retain the approved sculpt and cut-glass detail.
// Scene groups provide their position, scale, contact shadows and motion.
async function photograph(url,height,parent,crop=[0,0,1,1]){
 const texture=await textureLoader.loadAsync(url);texture.colorSpace=THREE.SRGBColorSpace;
 const [left,bottom,width,fractionHeight]=crop;
 texture.offset.set(left,bottom);texture.repeat.set(width,fractionHeight);
 const aspect=texture.image.width*width/(texture.image.height*fractionHeight);
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.012,depthWrite:true,toneMapped:false,side:THREE.DoubleSide});
 return mesh(new THREE.PlaneGeometry(height*aspect,height),material,parent,[0,height/2,0]);
}
const helper=new THREE.Group();scene.add(helper);
const glass=new THREE.Group();scene.add(glass);
const objectsReady=Promise.all([
 photograph(assetUrl('pucheglazik-photo-v1.png'),1.35,helper,[218/1024,92/1535,556/1024,1338/1535]),
 photograph(assetUrl('whiskey-photo-v2.png'),.84,glass,[210/1247,134/1261,828/1247,1017/1261]),voiceReady
]);
objectsReady.then(()=>{stage.removeAttribute('aria-busy');setState('awaiting-audio');caption('Добрый вечер, Руслан.');$('start-audio').hidden=false;unlockAudio();}).catch(()=>{
 $('status').textContent='Не удалось загрузить сцену. Обнови страницу, чтобы попробовать ещё раз.';$('status').hidden=false;
});
function shadow(parent,width=1,opacity=.4){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,1,64,64,64);g.addColorStop(0,`rgba(20,8,2,${opacity})`);g.addColorStop(1,'rgba(20,8,2,0)');x.fillStyle=g;x.fillRect(0,0,128,128);const o=mesh(new THREE.PlaneGeometry(width,width),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}),parent);o.rotation.x=-Math.PI/2;return o;}
const helperShadow=shadow(scene,1.1,.55);
const glassShadow=shadow(scene,.9,.4);
function paperTexture(type){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.fillStyle='#eee1c8';x.fillRect(0,0,1024,512);for(let i=0;i<5000;i++){x.fillStyle=`rgba(111,87,54,${Math.random()*.05})`;x.fillRect(Math.random()*1024,Math.random()*512,1,1);}x.fillStyle='#604d36';x.textAlign='center';if(type==='cover'){x.font='italic 70px Georgia';x.fillText('Руслану',512,250);x.font='22px Georgia';x.fillText('лично в руки',512,310);}else{x.textAlign='left';x.font='italic 48px Georgia';x.fillText('Руслан,',80,100);x.font='25px Georgia';x.fillText('У каждого хорошего вечера',80,185);x.fillText('есть своя история.',80,232);x.fillText('А у этой — письмо для тебя.',80,279);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const paperMat=new THREE.MeshStandardMaterial({map:paperTexture('inside'),roughness:.95,side:THREE.DoubleSide});
const backMat=new THREE.MeshStandardMaterial({color:0xeee1c8,roughness:1,side:THREE.DoubleSide});
const letter=new THREE.Group();scene.add(letter);
mesh(new THREE.PlaneGeometry(1.3,.58),paperMat,letter);
const topFold=new THREE.Group();topFold.position.y=.29;letter.add(topFold);mesh(new THREE.PlaneGeometry(1.3,.58),backMat,topFold,[0,.29,0]);
const bottomFold=new THREE.Group();bottomFold.position.y=-.29;letter.add(bottomFold);mesh(new THREE.PlaneGeometry(1.3,.58),backMat,bottomFold,[0,-.29,0]);
const cover=mesh(new THREE.PlaneGeometry(1.3,.58),new THREE.MeshStandardMaterial({map:paperTexture('cover'),roughness:1,side:THREE.DoubleSide}),letter,[0,0,.025]);
const paperShadow=shadow(scene,1.6,.35);paperShadow.visible=false;
function resetObjects(){helper.position.set(-.8,-1.22,-.3);helper.rotation.set(0,.12,0);helper.scale.setScalar(.64);glass.position.set(.9,-1.15,-.45);glass.rotation.set(0,0,0);glass.scale.setScalar(.75);glass.visible=false;helper.add(letter);letter.position.set(0,.51,.46);letter.rotation.set(.07,0,0);letter.scale.setScalar(.6);letter.visible=false;topFold.rotation.x=-Math.PI+.035;bottomFold.rotation.x=Math.PI-.04;cover.visible=true;paperShadow.visible=false;}
function hit(button,object,w,h){const p=object.localToWorld(new THREE.Vector3(0,object===glass?.42:0,0));p.project(camera);const r=stage.getBoundingClientRect();button.style.left=`${(p.x*.5+.5)*r.width}px`;button.style.top=`${(-p.y*.5+.5)*r.height}px`;button.style.width=`${w*r.width/393}px`;button.style.height=`${h*r.height/852}px`;}
function resize(){const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.fov=r.width>r.height?48:34;camera.position.z=r.width>r.height?5:8.3;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(stage);
const tick=new THREE.Clock();
function frame(){requestAnimationFrame(frame);const dt=Math.min(tick.getDelta(),.05);clock+=dt;for(let i=animations.length-1;i>=0;i--){const a=animations[i];const p=clamp((clock-a.start)/a.seconds,0,1);a.apply(ease(p),p);if(p===1){animations.splice(i,1);a.resolve(a.ticket===session);}}volume();if(!['delivery','pickup'].includes(state)&&!reduced){helper.rotation.z=Math.sin(clock*1.25)*.018;helper.rotation.y=.12+Math.sin(clock*.7)*.06;}helperShadow.position.set(helper.position.x,-1.23,helper.position.z);glassShadow.visible=glass.visible;glassShadow.position.set(glass.position.x,-1.24,glass.position.z);if(!$('glass-hit').hidden)hit($('glass-hit'),glass,110,155);if(!$('letter-hit').hidden)hit($('letter-hit'),letter,180,115);renderer.render(scene,camera);}resetObjects();resize();frame();
async function beginScene(){if(state!=='awaiting-audio')return;setState('seating');$('start-audio').hidden=true;if(!await speak('Добрый вечер, Руслан.'))return;if(!await speak('Что будете?'))return;setState('choice');$('drink-menu').hidden=false;}
function unlockAudio(){
 if(state!=='awaiting-audio')return;
 // Both calls are synchronous with the gesture. NFC navigation alone cannot unlock Safari audio.
 startMusic();
 if(voiceContext)voiceContext.resume().then(()=>{if(voiceContext.state==='running')beginScene();}).catch(()=>{});
 else beginScene();
}
$('start-audio').onclick=unlockAudio;
stage.addEventListener('pointerup',()=>{if(state==='awaiting-audio')unlockAudio();});
stage.addEventListener('keydown',event=>{if(state==='awaiting-audio'&&['Enter',' '].includes(event.key))unlockAudio();});
for(const button of document.querySelectorAll('[data-whisky]'))button.onclick=async()=>{
 if(state!=='choice')return;setState('ordering');$('drink-menu').hidden=true;$('caption').classList.remove('visible');
 glass.visible=true;
 const from=glass.position.clone();if(!await animate(1.8,t=>glass.position.lerpVectors(from,new THREE.Vector3(0,-1.2,1.6),t)))return;
 setState('drink');if(!await speak('Прошу.'))return;$('glass-hit').hidden=false;
};
$('glass-hit').onclick=async()=>{
 if(state!=='drink')return;setState('taking');$('glass-hit').hidden=true;$('caption').classList.remove('visible');
 const start=glass.position.clone();
 if(!await animate(.95,(t,p)=>{glass.position.lerpVectors(start,new THREE.Vector3(.70,-1.2,1.3),t);glass.position.y+=Math.sin(p*Math.PI)*.11;glass.rotation.z=-Math.sin(p*Math.PI)*.035;}))return;
 if(!await speak('И ещё кое-что.'))return;setState('delivery');letter.visible=true;
 const origin=helper.position.clone();if(!await animate(3.2,(t,p)=>{helper.position.lerpVectors(origin,new THREE.Vector3(.04,-1.22,1.4),t);helper.position.y+=Math.abs(Math.sin(p*Math.PI*10))*.055;helper.rotation.z=Math.sin(p*Math.PI*10)*.075;helper.rotation.y=.12*(1-t);} ))return;
 scene.attach(letter);const from=letter.position.clone(),rotation=letter.rotation.clone(),scale=letter.scale.x;
 if(!await animate(.85,t=>{letter.position.lerpVectors(from,new THREE.Vector3(0,-1.12,1.9),t);letter.rotation.set(THREE.MathUtils.lerp(rotation.x,-1.05,t),0,-.10*t);letter.scale.setScalar(THREE.MathUtils.lerp(scale,.95,t));}))return;
 paperShadow.position.set(0,-1.23,1.9);paperShadow.visible=true;const deliverySpeech=speak('Это вам, Руслан.');
 const end=helper.position.clone();if(!await animate(.75,(t,p)=>{helper.position.lerpVectors(end,new THREE.Vector3(-.64,-1.22,1.1),t);helper.rotation.z=Math.sin(p*Math.PI*4)*.06;}))return;
 if(!await deliverySpeech)return;setState('letter');$('letter-hit').hidden=false;
 if(await delay(3200))if(state==='letter')$('caption').classList.remove('visible');
};
$('letter-hit').onclick=async()=>{
 if(state!=='letter')return;setState('pickup');$('letter-hit').hidden=true;$('caption').classList.remove('visible');paperShadow.visible=false;
 const start=letter.position.clone();if(!await animate(.85,t=>{letter.position.lerpVectors(start,new THREE.Vector3(0,.1,2),t);letter.rotation.x=-1.05*(1-t);letter.rotation.z=-.1*(1-t);letter.scale.setScalar(.95+t*.22);} ))return;
 cover.visible=false;if(!await animate(1.1,t=>{topFold.rotation.x=(-Math.PI+.035)*(1-t);bottomFold.rotation.x=(Math.PI-.04)*(1-t);} ))return;
 setState('reading');dialog.showModal();
};
$('close-letter').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{if(state==='reading'){setState('letter');letter.position.set(0,-1.12,1.9);letter.rotation.set(-1.05,0,-.1);letter.scale.setScalar(.95);topFold.rotation.x=-Math.PI+.035;bottomFold.rotation.x=Math.PI-.04;cover.visible=true;paperShadow.visible=true;$('letter-hit').hidden=false;$('caption').classList.remove('visible');}});
