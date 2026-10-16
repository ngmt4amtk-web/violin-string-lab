import {STRINGS,DEFAULT,PRESETS,calculate,sanitize,changePitch,changeString,noteName,encode,decode} from './model.mjs?v=20261016.3';
const $=id=>document.getElementById(id), COLORS={ink:'#25382f',muted:'#68736a',grid:'#dcded3',green:'#2b6651',gs:'#d5e8d8',orange:'#b17727',os:'#f2e4c5',red:'#ae5c4d',rs:'#efd3ca',paper:'#fffef9'};
const STATES={stable:['規則的に鳴る範囲','つかんで運び、1周期に1回すべる振動が成立しうる条件です。'],light:['スカスカ側','力が下の境目より小さい条件。余分なすべりが生じうる側です。'],heavy:['ギー側','力が上の境目より大きい条件。規則的なすべりを保てなくなる側です。'],none:['緑の帯がない','下の境目が上の境目に達し、この模型では成立範囲がありません。'],stopped:['弓が止まっています','定常音の模型では判定しません。弓の速さを上げると帯が現れます。']};
let state=location.hash.includes('string=')?decode(location.hash):{...DEFAULT}, model=calculate(state), saved=null;
try{const item=JSON.parse(localStorage.getItem('string-lab-a'));if(item?.version===1)saved=sanitize(item.state);}catch{}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let playing=!reduced.matches,phase=.14,lastTime=0,frame=0,motionMode='time';
const fmt=(n,d=1)=>Number.isFinite(n)?n.toLocaleString('ja-JP',{maximumFractionDigits:d}):'—';
const gf=n=>n>=1e6?`${Math.round(n/10000)}万`:n>=10000?`${fmt(n/10000,1)}万`:n<1?fmt(n,2):fmt(n,n<10?1:0);
const width=()=>matchMedia('(max-width:670px)').matches?360:600;
const svg=(w,h,body,label)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" style="font-family:-apple-system,BlinkMacSystemFont,Helvetica Neue,sans-serif">${body}</svg>`;
const txt=(x,y,text,size=12,anchor='start',fill=COLORS.muted,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" ${extra}>${text}</text>`;
const logPos=(n,min,max,a,b)=>a+(Math.log10(Math.max(min,n))-Math.log10(min))/(Math.log10(max)-Math.log10(min))*(b-a);
function domain(){return [.1,1000];}
function bandSVG(m,w=width(),scale=domain([m]),current=true){
 const h=112,l=14,r=w-14,y=31,bh=27,[lo,hi]=scale,x=n=>Math.min(r,Math.max(l,logPos(n,lo,hi,l,r)));
 let body='';
 if(m.state==='stopped')body+=`<rect x="${l}" y="${y}" width="${r-l}" height="${bh}" rx="4" fill="#e3e5dd"/>`;
 else if(m.minimum>=m.maximum)body+=`<rect x="${l}" y="${y}" width="${r-l}" height="${bh}" rx="4" fill="#e7e0d6"/>${txt(w/2,y+18,'この条件では緑の帯なし',12,'middle',COLORS.ink)}`;
 else{
  const a=x(m.minimum),b=x(m.maximum);
  body+=`<rect x="${l}" y="${y}" width="${a-l}" height="${bh}" fill="${COLORS.os}"/><rect x="${a}" y="${y}" width="${b-a}" height="${bh}" fill="${COLORS.gs}"/><rect x="${b}" y="${y}" width="${r-b}" height="${bh}" fill="${COLORS.rs}"/>`;
  body+=`<path d="M${a} ${y-3}v${bh+6}M${b} ${y-3}v${bh+6}" stroke="${COLORS.ink}" stroke-width="1.5" ${m.beta>.2?'stroke-dasharray="3 3"':''}/>`;
  if(a-l>50)body+=txt((l+a)/2,y+18,'スカスカ',11,'middle',COLORS.orange);
  if(b-a>40)body+=txt((a+b)/2,y+18,'成立',11,'middle',COLORS.green);
  if(r-b>35)body+=txt((b+r)/2,y+18,'ギー',11,'middle',COLORS.red);
 }
 for(let n=lo;n<=hi*1.01;n*=10){const p=x(n);const exponent=Math.round(Math.log10(n));if(hi>1e5&&exponent%2!==0&&n!==lo&&n<hi)continue;body+=`<path d="M${p} ${y+bh+5}v5" stroke="${COLORS.grid}"/>`+txt(p,y+bh+25,gf(n),10,n===lo?'start':n>=hi?'end':'middle');}
 body+=txt(r,105,'弓の力 gf / 倍率の目盛り',10,'end');
 if(current){const p=x(m.force);body+=`<path d="M${p} ${y-10}v${bh+20}" stroke="${COLORS.ink}" stroke-width="1.5"/><path d="M${p-4} ${y-10}h8l-4 5Z" fill="${COLORS.ink}"/>`;body+=txt(Math.max(l+24,Math.min(r-24,p)),16,`今 ${gf(m.force)}`,11,'middle',COLORS.ink,'font-weight="600"');}
 return svg(w,h,body,`弓の力の帯。下の境目${gf(m.minimum)}gf、上の境目${gf(m.maximum)}gf、現在${gf(m.force)}gf。${STATES[m.state][0]}`);
}
function advice(m){
 switch(m.state){case 'stopped':return '弓速を上げて、止まっている時と動いている時を比べてみましょう。';case 'none':return 'まず駒から少し離してみると、この模型では帯が開く方向へ進みます。損失の仮定も確認してください。';case 'light':return '試すなら：弓の力を足す、または駒から少し離す。ほかの条件を保って一つずつ変えると、帯の動きが見えます。';case 'heavy':return '試すなら：弓の力を抜く、または弓を速くする。今の点が緑の帯へ入る方向を探してみましょう。';default:return '今の条件をAに保存してから、一つだけ変えてみましょう。力を変えると点が、距離や弓速を変えると帯も動きます。';}
}
function syncControls(){
 const maxDistance=Math.min(65,model.vibratingLength*.45);$('distance').max=maxDistance.toFixed(6);$('distance-number').max=maxDistance.toFixed(6);
 for(const key of ['semitone','distance','speed','tension','fingerLoss','friction','bodyLoss','length']){$(key).value=state[key];}
 for(const k of ['distance','speed','force'])$(k+'-number').value=Math.round(state[k]*10)/10;
 $('force').value=1000*Math.log1p(state.force)/Math.log(1001);
 document.querySelectorAll('input[type="range"]').forEach(el=>el.style.setProperty('--fill',`${100*(Number(el.value)-Number(el.min))/(Number(el.max)-Number(el.min))}%`));
 document.querySelectorAll('[data-string]').forEach(el=>{el.setAttribute('aria-pressed',el.dataset.string===state.string);const st=STRINGS[state.string].midi+state.semitone-STRINGS[el.dataset.string].midi;el.disabled=state.keepPitch&&(st<0||st>24);});
 if($('keep-pitch'))$('keep-pitch').checked=state.keepPitch;
 document.querySelectorAll('[data-pitch]').forEach(el=>el.classList.toggle('active',Number(el.dataset.pitch)===state.semitone));
 document.querySelectorAll('[name="lock"]').forEach(el=>el.checked=el.value===state.lock);
 $('pitch-output').textContent=state.semitone===0?'開放弦':`${noteName(state)} / +${state.semitone}半音`;
 $('length-output').textContent=`振動する長さ ${fmt(model.vibratingLength)} mm · ${fmt(model.frequency)} Hz`;
 $('beta-output').textContent=`今は弦長の ${fmt(model.beta*100)}% の位置（β = ${fmt(model.beta,3)}）`;
 if($('pitch-caution'))$('pitch-caution').hidden=state.semitone===0;
 $('tension-output').textContent=`${fmt(state.tension)} N`;$('fingerLoss-output').textContent=`${fmt(state.fingerLoss)} 倍${state.semitone===0?' / 開放には適用なし':''}`;
 $('friction-output').textContent=fmt(state.friction,2);$('bodyLoss-output').textContent=`${fmt(state.bodyLoss)} 倍`;$('length-output-control').textContent=`${fmt(state.length)} mm`;$('resistance-output').textContent=`${fmt(state.resistance)} N·s/m`;
 $('center-force').disabled=['none','stopped'].includes(model.state)||model.minimum>1000;
}
let spokenTimer;
function render(){
 state=sanitize(state);model=calculate(state);syncControls();
 document.querySelector('.overview').dataset.state=model.state;$('note-badge').textContent=noteName(state);
 $('status').textContent=STATES[model.state][0];$('state-description').textContent=STATES[model.state][1];
 $('min-force').innerHTML=model.state==='stopped'?'—':`${gf(model.minimum)} <small>gf</small>`;
 $('max-force').innerHTML=model.state==='stopped'?'—':`${gf(model.maximum)} <small>gf</small>`;
 $('current-force').innerHTML=`${gf(state.force)} <small>gf</small>`;$('band').innerHTML=bandSVG(model);$('advice').textContent=advice(model);
 if($('window-ratio'))$('window-ratio').textContent=model.state==='stopped'?'':model.minimum>=model.maximum?'成立しうる幅なし':`帯の幅：上の境目は下の ${fmt(model.ratio,1)} 倍`;
 const cautions=[];if(model.beta>.2)cautions.push('駒から弦長の20%を超えています。駒に近い前提の近似から離れるため、境目を点線で表示しています。');if(state.distance<10)cautions.push('駒にとても近い条件です。模型は弓が1点で触れると仮定していますが、実際には弓毛に幅があります。');if(model.effectiveR/model.z<10)cautions.push('損失を大きくした条件です。胴の抵抗が弦より十分大きいという近似が弱くなります。');if(model.maximum>1000||model.minimum<.1)cautions.push('境目の一部が固定目盛りの外にあります。値は上の数値欄を参照してください。');
 $('scope-note').hidden=!cautions.length;$('scope-note').textContent=cautions.join(' ');
 drawString();drawMap();drawCompare();updatePlay();updateMonitor();
 clearTimeout(spokenTimer);spokenTimer=setTimeout(()=>{if(!$('spoken-state'))return;$('spoken-state').textContent=`${STATES[model.state][0]}。${model.state==='stopped'?'':`下の境目${gf(model.minimum)}、上の境目${gf(model.maximum)}グラム重。`}`;},350);
}
let motionNodes={};
function drawString(){
 const w=width(),h=177,left=22,right=w-22,span=right-left,active=span*model.vibratingLength/state.length,end=left+active,bow=left+span*state.distance/state.length;
 let body=`<path d="M${left} 91H${right}" stroke="${COLORS.grid}" stroke-dasharray="3 4"/>`;
 if(state.semitone>0)body+=`<path d="M${end} 91H${right}" stroke="#c9cdc4" stroke-width="2"/>`;
 body+=`<path id="string-path" fill="none" stroke="${STRINGS[state.string].color}" stroke-width="2.5" stroke-linejoin="round"/><circle id="corner" r="3" fill="${COLORS.green}"/>`;
 body+=`<rect x="${bow-6}" y="47" width="12" height="84" rx="3" fill="#d8caa5" fill-opacity=".5" stroke="#aa9672" stroke-width=".6"/><g id="hair-dots" fill="#9d8764">${[0,1,2,3,4].map(i=>`<circle id="hair-${i}" cx="${bow}" cy="${52+i*16}" r="1.4"/>`).join('')}</g>`;
 body+=`<path d="M${left} 65v53" stroke="${COLORS.ink}" stroke-width="3"/>`+txt(left,146,'駒',12,'start',COLORS.ink);
 body+=`<path d="M${end} 77v28" stroke="${COLORS.ink}" stroke-width="${state.semitone===0?3:6}" stroke-linecap="round"/>`+txt(end,146,state.semitone===0?'上駒':'指で押さえる',11,state.semitone===0?'end':'middle',COLORS.ink);
 body+=`<path d="M${left} 25H${end}M${left} 21v8M${end} 21v8" stroke="${COLORS.grid}"/>`+txt((left+end)/2,16,`${fmt(model.vibratingLength,0)} mm`,11,'middle');
 body+=txt(Math.min(w-45,Math.max(55,bow+8)),44,`弓 ${fmt(state.distance)} mm`,10,'start',COLORS.ink);
 $('string-figure').innerHTML=svg(w,h,body,`${state.string}弦、${noteName(state)}。振動する長さ${fmt(model.vibratingLength)}mm。左が駒、右が上駒または押さえた指。`);
 motionNodes={path:$('string-path'),corner:$('corner'),left,end,span,active,bow,dots:[0,1,2,3,4].map(i=>$('hair-'+i))};
 const stable=model.state==='stable';
 $('motion-label').textContent=stable?'1周期に1回、すべる':model.state==='stopped'?'止まった弦':model.state==='light'?'余分なすべりの模式図':'規則が崩れる模式図';
 $('motion-time').textContent=stable?`実際は毎秒 約${fmt(model.frequency,0)}周期`:'実測波形ではありません';
 $('stick-track').style.width=`${model.stick*100}%`;$('slip-track').style.width=`${model.slip*100}%`;
 document.querySelector('.phase-track').classList.toggle('muted',!stable);
 $('motion-description').textContent=stable?`つかむ時間 ${fmt(model.stick*100)}% / すべる時間 ${fmt(model.slip*100)}%。${motionMode==='time'?'時間を1000倍に引き伸ばしています。':'音高によらず1周期を1.8秒で表示しています。'} 理想模型の最大振幅は片側 約${fmt(model.amplitude,3)} mm。`:'帯の外では理想的な周期の説明を適用できません。静止した形は模式図で、振動を計算した結果ではありません。';
 animateString();
}
function animateString(){
 const n=motionNodes;if(!n.path)return;
 const visualPhase=model.state==='stable'?phase:.14;
 const p=(visualPhase+model.beta/2)%1,xc=p<.5?p*2:2-p*2,sign=p<.5?1:-1,amp=Math.min(39,model.amplitude*45);
 const points=[];
 for(let i=0;i<=100;i++){
  const q=i/100;let y=0;
  if(model.state==='stable')y=4*amp*sign*(q<=xc?q*(1-xc):xc*(1-q));
  else if(model.state==='light')y=14*Math.sin(Math.PI*q)*Math.sin(visualPhase*Math.PI*4-q*6)+5*Math.sin(2*Math.PI*q)*Math.sin(visualPhase*Math.PI*8);
  else if(model.state!=='stopped')y=25*Math.sin(Math.PI*q)*(Math.sin(visualPhase*2*Math.PI)*.7+Math.sin(visualPhase*6*Math.PI+q*3)*.22);
  points.push(`${i?'L':'M'}${(n.left+n.active*q).toFixed(2)} ${(91-y).toFixed(2)}`);
 }
 n.path.setAttribute('d',points.join(' '));n.corner.style.display=model.state==='stable'?'':'none';n.corner.setAttribute('cx',n.left+n.active*xc);n.corner.setAttribute('cy',91-4*amp*sign*xc*(1-xc));
 n.dots.forEach((el,i)=>el.setAttribute('cy',model.state!=='stable'?52+i*16:50+((i*16+phase*80)%80)));
}
function updatePlay(){const can=model.state==='stable';$('play').disabled=!can;$('play').textContent=can?(playing?'一時停止':'動かす'):'静止の模式図';$('play').setAttribute('aria-pressed',String(playing&&can));if(playing&&can&&!frame&&!document.hidden){lastTime=0;frame=requestAnimationFrame(tick);}}
function tick(t){frame=0;if(!playing||document.hidden||model.state!=='stable')return;if(lastTime)phase=(phase+Math.min(.05,(t-lastTime)/1000)*(motionMode==='time'?model.frequency/1000:1/1.8))%1;lastTime=t;animateString();frame=requestAnimationFrame(tick);}
let mapGeom={};
function drawMap(){
 const w=width(),h=w===360?264:285,l=45,r=w-15,t=21,b=h-43,dmax=65,allowedMax=Math.min(65,model.vibratingLength*.45),fmin=.1,fmax=1000;
 const x=d=>logPos(d,2,dmax,l,r),y=f=>logPos(f,fmin,fmax,b,t),boundedY=f=>Math.min(b,Math.max(t,y(f)));
 let body=`<defs><clipPath id="map-clip"><rect x="${l}" y="${t}" width="${r-l}" height="${b-t}" rx="3"/></clipPath></defs><rect x="${l}" y="${t}" width="${r-l}" height="${b-t}" fill="#f2f1e9"/>`;
 const samples=Array.from({length:101},(_,i)=>{const d=2*(allowedMax/2)**(i/100),m=calculate({...state,distance:d});return {x:x(d),a:boundedY(m.minimum),b:boundedY(m.maximum),m};});
 const activeRight=x(allowedMax);
 const path=(p)=>p.map((v,i)=>`${i?'L':'M'}${v[0].toFixed(2)},${v[1].toFixed(2)}`).join(' ');
 if(state.speed>0){
  body+=`<g clip-path="url(#map-clip)"><path d="${path([[l,b],...samples.map(p=>[p.x,p.a]),[activeRight,b]])}Z" fill="${COLORS.os}"/><path d="${path([[l,t],...samples.map(p=>[p.x,p.b]),[activeRight,t]])}Z" fill="${COLORS.rs}"/>`;
  const valid=samples.filter(p=>p.m.minimum<p.m.maximum);
  if(valid.length)body+=`<path d="${path([...valid.map(p=>[p.x,p.a]),...valid.toReversed().map(p=>[p.x,p.b])])}Z" fill="${COLORS.gs}"/>`;
  for(const which of ['a','b'])for(const outside of [false,true]){const segment=samples.filter(p=>(p.m.beta>.2)===outside);if(segment.length)body+=`<path d="${path(segment.map(p=>[p.x,p[which]]))}" fill="none" stroke="${which==='a'?COLORS.orange:COLORS.red}" stroke-width="1.6" ${outside?'stroke-dasharray="4 4"':''}/>`;}body+='</g>';
 }
 if(allowedMax<65)body+=`<rect x="${activeRight}" y="${t}" width="${r-activeRight}" height="${b-t}" fill="#e1e3dc"/>`+txt((activeRight+r)/2,t+20,'設定外',10,'middle');
 for(const n of [.1,1,10,100,1000])body+=`<path d="M${l} ${y(n)}H${r}" stroke="${COLORS.ink}" stroke-opacity=".1"/>`+txt(l-8,y(n)+4,fmt(n),10,'end');
 for(const n of [2,5,10,20,40,65].filter(n=>n<=dmax))body+=`<path d="M${x(n)} ${t}V${b}" stroke="${COLORS.ink}" stroke-opacity=".1"/>`+txt(x(n),b+19,n,10,'middle');
 body+=txt(l,12,'弓の力 gf',10)+txt(r,h-4,'駒からの距離 mm',10,'end')+txt(l,h-4,'← 駒寄り',10);
 if(saved){const a=calculate(saved);if(a.distance<=dmax&&a.force>=fmin)body+=`<circle cx="${x(a.distance)}" cy="${boundedY(a.force)}" r="7" fill="none" stroke="${COLORS.ink}" stroke-dasharray="2 2"/>`+txt(x(a.distance)+10,boundedY(a.force)-5,'A',11);}
 const px=x(state.distance),py=boundedY(state.force);body+=`<path d="M${px} ${t}V${b}M${l} ${py}H${r}" stroke="${COLORS.ink}" stroke-opacity=".28" stroke-dasharray="3 4"/><circle cx="${px}" cy="${py}" r="7" fill="${COLORS.ink}" stroke="white" stroke-width="2"/>`;
 $('map').innerHTML=svg(w,h,body,`距離と力の地図。現在${fmt(state.distance)}mm、${gf(state.force)}gf。${STATES[model.state][0]}`);
 $('map').setAttribute('aria-valuenow',state.force);$('map').setAttribute('aria-valuetext',`${fmt(state.distance)}mm、${gf(state.force)}gf、${STATES[model.state][0]}`);
 mapGeom={w,h,l,r,t,b,dmax,fmin,fmax};
}
function drawCompare(){
 $('compare-empty').hidden=!!saved;$('compare-content').hidden=!saved;$('clear-a').hidden=!saved;if(!saved)return;
 const a=calculate(saved),scale=domain([a,model]);
 $('comparison-rows').innerHTML=[['A',a],['B',model]].map(([name,m])=>`<div class="comparison-row"><div><h3>${name}</h3><span class="chart-note">${name==='A'?'保存':'現在'}</span></div><div><p class="comparison-condition">${m.string}弦 · ${noteName(m)} · ${fmt(m.distance)} mm · ${fmt(m.speed)} cm/秒 · ${gf(m.force)} gf</p><div>${bandSVG(m,width()===360?290:530,scale)}</div><p class="comparison-values">${STATES[m.state][0]}${m.state==='stopped'?'':` / 下 ${gf(m.minimum)}〜上 ${gf(m.maximum)} gf`}</p></div></div>`).join('');
 const names={string:'弦',semitone:'開放からの半音数',distance:'距離',speed:'弓速',force:'弓の力',length:'開放弦長',tension:'張力',friction:'摩擦差',resistance:'基準抵抗',fingerLoss:'押弦の損失',bodyLoss:'楽器の損失',lock:'距離の保ち方',keepPitch:'同じ音高を保つ設定'};
 const changed=Object.keys(DEFAULT).filter(k=>saved[k]!==state[k]).map(k=>names[k]);
 $('comparison-note').textContent=changed.length?`変わった条件：${changed.join('・')}。AとBの帯は共通の目盛りです。地図のAは距離と力だけの位置を示します。`:'AとBは同じ条件です。条件を一つ動かしてみましょう。';
}
function set(next){state=sanitize(next);$('action-message').textContent='';render();}
for(const key of ['distance','speed','tension','fingerLoss','friction','bodyLoss','length'])$(key).addEventListener('input',e=>set({...state,[key]:Number(e.target.value)}));
$('semitone').addEventListener('input',e=>set(changePitch(state,Number(e.target.value))));
$('force').addEventListener('input',e=>set({...state,force:Math.expm1(Number(e.target.value)/1000*Math.log(1001))}));
for(const key of ['distance','speed','force'])$(key+'-number').addEventListener('change',e=>set({...state,[key]:Number.isFinite(e.target.valueAsNumber)?e.target.valueAsNumber:state[key]}));
document.querySelectorAll('[data-string]').forEach(el=>el.addEventListener('click',()=>set(changeString(state,el.dataset.string))));
$('keep-pitch')?.addEventListener('change',e=>set({...state,keepPitch:e.target.checked}));
document.querySelectorAll('[data-pitch]').forEach(el=>el.addEventListener('click',()=>set(changePitch(state,Number(el.dataset.pitch)))));
document.querySelectorAll('[name="lock"]').forEach(el=>el.addEventListener('change',()=>set({...state,lock:el.value})));
document.querySelectorAll('[data-preset]').forEach(el=>el.addEventListener('click',()=>{set(PRESETS[el.dataset.preset]);document.querySelector('.overview').scrollIntoView({behavior:'instant',block:'start'});}));
$('reset').addEventListener('click',()=>{set(DEFAULT);history.replaceState(null,'',location.pathname+location.search);});
$('center-force').addEventListener('click',()=>set({...state,force:Math.min(1000,Math.sqrt(model.minimum*model.maximum))}));
$('play').addEventListener('click',()=>{playing=!playing;updatePlay();});
$('motion-mode')?.addEventListener('change',e=>{motionMode=e.target.value;drawString();});
document.addEventListener('visibilitychange',()=>{lastTime=0;updatePlay();});
reduced.addEventListener('change',e=>{if(e.matches){playing=false;updatePlay();}});
$('save-a').addEventListener('click',()=>{saved={...state};let persisted=true;try{localStorage.setItem('string-lab-a',JSON.stringify({version:1,state:saved}));}catch{persisted=false;}render();$('action-message').textContent=persisted?'Aに保存しました。条件を変えて比較できます。':'この画面のAに保存しました。ブラウザへの保存は利用できません。';});
$('clear-a').addEventListener('click',()=>{saved=null;try{localStorage.removeItem('string-lab-a');}catch{}render();});
$('restore-a').addEventListener('click',()=>{if(saved)set(saved);});
$('share').addEventListener('click',async()=>{const url=new URL(location.href);url.hash=encode(state);history.replaceState(null,'',url);try{await navigator.clipboard.writeText(url.href);$('action-message').textContent='今の条件のリンクをコピーしました。';$('share-fallback').hidden=true;}catch{$('share-url').value=url.href;$('share-fallback').hidden=false;$('share-url').select();$('action-message').textContent='下のURLをコピーすると同じ条件を開けます。';}});
window.addEventListener('hashchange',()=>{if(location.hash.includes('string='))set(decode(location.hash));});
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(render,140);});
function pickMap(event){const box=$('map').querySelector('svg').getBoundingClientRect(),g=mapGeom,px=(event.clientX-box.left)/box.width*g.w,py=(event.clientY-box.top)/box.height*g.h;const fx=Math.min(1,Math.max(0,(px-g.l)/(g.r-g.l))),fy=Math.min(1,Math.max(0,(g.b-py)/(g.b-g.t)));set({...state,distance:2*(g.dmax/2)**fx,force:g.fmin*(g.fmax/g.fmin)**fy});}
let dragging=false;$('map').addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;$('map').setPointerCapture(e.pointerId);pickMap(e);});$('map').addEventListener('pointermove',e=>{if(dragging)pickMap(e);});for(const name of ['pointerup','pointercancel','lostpointercapture'])$('map').addEventListener(name,()=>dragging=false);
$('map').addEventListener('keydown',e=>{const steps={ArrowLeft:{distance:state.distance/1.08},ArrowRight:{distance:state.distance*1.08},ArrowUp:{force:Math.max(.1,state.force*1.15)},ArrowDown:{force:state.force/1.15}};if(steps[e.key]){e.preventDefault();set({...state,...steps[e.key]});}});
$('export').addEventListener('click',async()=>{
 const button=$('export');button.disabled=true;
 try{
  const w=1100,h=880,m=model;
  let body=`<rect width="${w}" height="${h}" fill="#f4f3eb"/>`+txt(65,75,'STRING LAB / 弦の鳴りかた',24,'start',COLORS.green,'font-weight="600"')+txt(65,137,STATES[m.state][0],37,'start',COLORS.ink);
  body+=txt(65,188,`${m.string}弦 · ${noteName(m)} · 駒から ${fmt(m.distance)} mm · 弓速 ${fmt(m.speed)} cm/秒`,23,'start',COLORS.ink);
  body+=`<g transform="translate(55 215) scale(1.65)">${bandSVG(m,600).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</g>`;
  const lines=[`下の境目 ${m.state==='stopped'?'—':gf(m.minimum)+' gf'} / 上の境目 ${m.state==='stopped'?'—':gf(m.maximum)+' gf'} / 今の力 ${gf(m.force)} gf`,`振動長 ${fmt(m.vibratingLength)} mm / 弦長に対する割合 ${fmt(m.beta*100)}%`,`張力 ${fmt(m.tension)} N / 摩擦差 ${fmt(m.friction,2)} / 基準抵抗 ${fmt(m.resistance)} N·s/m`,`押弦時の損失 ${fmt(m.fingerLoss)}倍 / 楽器側の損失 ${fmt(m.bodyLoss)}倍`,`開放弦長 ${fmt(m.length)} mm / 音高変更時：${m.lock==='ratio'?'弦長の割合を保つ':'駒からの距離を保つ'}`,`String Lab 1.2 / Schelleng v1 / A4 = 440 Hz`,`定常音の理想模型。数値は教材仮定による計算値で、実測値ではありません。`,`緑の範囲内でも規則的な振動が保証されるわけではありません。`,`Schelleng model / Euphonics 9.3.1 / Schoonderwaldt et al. (2008)`];
  lines.forEach((l,i)=>body+=txt(65,455+i*45,l,i>4?18:22,'start',i>4?COLORS.muted:COLORS.ink));
  const data=new Blob([svg(w,h,body,'弦の鳴りかた 現在の条件')],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(data),img=new Image();
  try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw Error('画像を作成できません');const out=URL.createObjectURL(blob),a=document.createElement('a');a.href=out;a.download=`string-lab-${m.string}-${noteName(m).replace('♯','sharp')}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(out),30000);$('action-message').textContent='現在の条件と図をPNGで書き出しました。';}finally{URL.revokeObjectURL(url);}
 }catch{$('action-message').textContent='このブラウザでは画像保存に失敗しました。条件のリンクをご利用ください。';}finally{button.disabled=false;}
});
// Sources are inside details; reveal them when a source link is followed.
document.querySelectorAll('a[href^="#source-"]').forEach(a=>a.addEventListener('click',()=>{$('sources').open=true;}));
function updateMonitor(){
 const overview=document.querySelector('.overview').getBoundingClientRect(),about=$('about').getBoundingClientRect();
 $('mobile-monitor').hidden=overview.bottom>120||about.top<120||innerWidth>670;
 $('monitor-status').textContent=STATES[model.state][0];$('monitor-force').textContent=`今 ${gf(model.force)} gf`;
 $('monitor-band').innerHTML=bandSVG(model,360).replace('viewBox="0 0 360 112"','viewBox="0 20 360 46"');
 $('monitor-caption').textContent=model.state==='stopped'?'弓速ゼロ：定常音の判定なし':`教材の計算値：下 ${gf(model.minimum)}〜上 ${gf(model.maximum)} gf`;
}
$('back-to-diagram').addEventListener('click',()=>document.querySelector('.overview').scrollIntoView({behavior:reduced.matches?'auto':'smooth'}));
let scrollFrame=0;addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;updateMonitor();});},{passive:true});
render();
