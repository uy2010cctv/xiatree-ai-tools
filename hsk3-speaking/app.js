/* Speaking Studio: local-first UI. No analytics, external assets or audio upload. */
(function(){
'use strict';
const $=id=>document.getElementById(id), C=HSKCore, bank=HSK_QUESTIONS;
const labels={repeat:'Listen & repeat / retell',read:'Read aloud',picture:'Picture description',topic:'Topic response'};
const icons={repeat:'M4 12h3l2-7 4 14 3-10 2 3h3',read:'M4 5h6l2 2 2-2h6v15h-6l-2 2-2-2H4V5m8 2v15',picture:'M4 4h16v16H4V4m0 13 5-6 5 6 2-3 4 5M15 8h1',topic:'M4 4h16v12H10l-6 4V4'};
const rubric=[['Pronunciation','Sounds, tones and word stress'],['Fluency','Continuity and meaningful pauses'],['Grammar','Clear word order and sentence control'],['Vocabulary','Accurate words suited to the task'],['Completeness','Relevant details, development and ending']];
const STORAGE='hsk30.studio.v1';
let saved={history:[],license:null,theme:'light'};
try{const p=JSON.parse(localStorage.getItem(STORAGE)||'null'); if(p&&typeof p==='object'){saved.theme=p.theme==='dark'?'dark':'light'; saved.license=p.license||null; saved.history=Array.isArray(p.history)?p.history.filter(h=>h&&typeof h.date==='string'&&Number.isFinite(h.score)&&h.score>=20&&h.score<=100&&typeof h.title==='string').slice(-200):[];}}catch{ $('message').textContent='Browser storage is unavailable or was reset. You can still practice; export your scores before leaving.';}
let q=bank.find(x=>x.free),mode='practice',active=false,session=[],index=0,attempts=[],reviewIndex=0;
let current=null,interval=null,started=0,phase='',generation=0,flashTimer=null,sourceEnd=null;
let stream=null,recorder=null,audioContext=null,analyser=null,meterFrame=null,micPending=false;
let playbackUrl=null,closing=false; const urls=new Set();
const pro=()=>C.isPro(saved.license,location.hostname);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateKey=()=>{const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(saved));return true;}catch{$('message').textContent='Storage is full or blocked. Your session works, but changes may not survive a reload. Export history to keep a copy.';return false;}}
function say(text,error=false){$('message').textContent=text; $('message').classList.toggle('error',error);}
function filtered(){return bank.filter(x=>x.level===Number($('level').value)&&($('part').value==='all'||x.part===$('part').value));}
function icon(part){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[part]}"/></svg>`;}
function renderList(){
 $('access-badge').textContent=pro()?'Pro · 48 / 48':'Free · 12 / 48';
 $('question-list').innerHTML=filtered().map(x=>`<button class="question-item" data-q="${x.id}" aria-current="${q.id===x.id}" ${active?'disabled':''}>${icon(x.part)}<span class="question-copy">${escape(x.title)}<small>${x.task==='retell'?'Listen & retell':labels[x.part]}</small></span><span class="tier">${C.canAccess(x,pro())?'': 'PRO'}</span></button>`).join('');
 $('nav-pro').textContent=pro()?'Pro active':'Unlock Pro · $14'; $('deactivate').hidden=!pro(); $('dev-note').hidden=!C.isDevHost(location.hostname);
}
function renderQuestion(){
 const rows=filtered(); $('question-tag').textContent=`LEVEL ${q.level} · ${q.task==='retell'?'LISTEN & RETELL':labels[q.part].toUpperCase()}`;
 $('question-position').textContent=`${Math.max(1,rows.findIndex(x=>x.id===q.id)+1)} / ${rows.length}`;
 $('question-title').textContent=q.title;
 const unlocked=C.canAccess(q,pro());$('start').disabled=active||!unlocked;
 if(!unlocked){
  $('question-instruction').textContent='This skill at this level is in the Pro library. Choose “All four skills” for your free prompts, or activate Pro below.';
  $('source').textContent='Pro prompt · unlock the complete library to practice this task.';$('source').classList.add('masked');
  for(const id of ['pinyin','translation','hint','answer','answer-en','analysis','follow-up'])$(id).textContent='';
  $('pinyin').hidden=true;$('translation').hidden=true;$('scene').hidden=true;$('scene').innerHTML='';$('vocab').innerHTML='';$('mistakes').innerHTML='';
  $('study-aids').hidden=true;$('listen').disabled=true;$('show-pinyin').disabled=true;$('show-translation').disabled=true;
  $('hint-detail').open=false;$('answer-detail').open=false;$('timing-description').textContent='Choose an unlocked prompt to begin.';
  renderList();return;
 }
 $('question-instruction').textContent=q.part==='repeat'?(q.task==='retell'?'Listen once, then retell the key facts in your own words.':'Listen to the sentence, then repeat it as closely as you can.'):'Read the prompt, gather your thoughts, and speak in Mandarin.';
 $('source').classList.remove('masked');
 const re=new RegExp('('+q.vocab.map(v=>v.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','g');
 $('source').innerHTML=escape(q.prompt).replace(re,'<mark>$1</mark>');
 if(mode==='exam'&&q.part==='repeat'){ $('source').textContent='The source is hidden. You will hear it once when the session starts; a timed text fallback is used if no local Mandarin voice is available.'; $('source').classList.add('masked');}
 $('pinyin').textContent=q.pinyin; $('pinyin').hidden=!$('show-pinyin').checked||mode==='exam';
 $('translation').textContent=q.translation; $('translation').hidden=!$('show-translation').checked||mode==='exam';
 $('scene').hidden=q.part!=='picture'; $('scene').innerHTML=q.scene?HSK_SCENES[q.scene]:'';
 $('hint').textContent=q.hint; $('vocab').innerHTML=q.vocab.map(v=>`<li><strong lang="zh-CN">${v.word}</strong> · ${v.pinyin} · ${escape(v.english)}</li>`).join('');
 for(const [id,val] of [['answer',q.answer],['answer-en',q.answerEnglish],['analysis',q.analysis],['follow-up',q.followUp]]) $(id).textContent=val;
 $('mistakes').innerHTML=q.mistakes.map(x=>`<li>${escape(x)}</li>`).join('');
 $('timing-description').textContent=`${q.prep}s preparation · ${q.seconds}s speaking · practice preset`;
 $('study-aids').hidden=mode==='exam'; $('show-pinyin').disabled=mode==='exam'; $('show-translation').disabled=mode==='exam'; $('listen').disabled=mode==='exam'||active;
 $('hint-detail').open=false; $('answer-detail').open=false;
 renderList();
}
function resetUrls(){for(const u of urls) URL.revokeObjectURL(u); urls.clear(); playbackUrl=null;}
function setBusy(value){active=value; $('studio').classList.toggle('busy',value); for(const id of ['level','part','practice-mode','exam-mode','start','enable-mic','speed','verify-license','deactivate']) $(id).disabled=value; $('start').hidden=value; $('abort').hidden=!value; $('finish').hidden=true; renderList();}
function setMode(next){if(active)return; mode=next; $('practice-mode').setAttribute('aria-pressed',String(next==='practice')); $('exam-mode').setAttribute('aria-pressed',String(next==='exam')); $('session-mode-note').textContent=next==='exam'?'No aids · automatic transitions':'Explore at your own pace'; $('start').textContent=next==='exam'?'Start strict session':'Start practice'; if(next==='exam')$('speed').value='1'; renderQuestion();}
function clearClock(){clearInterval(interval);interval=null;}
function cancelSource(){ clearTimeout(flashTimer); flashTimer=null; if(sourceEnd){const done=sourceEnd;sourceEnd=null;done(false);} if('speechSynthesis'in window) speechSynthesis.cancel();}
function sourcePlayback(question,token){
 cancelSource();
 return new Promise(resolve=>{
  let finished=false; const finish=(ok=true)=>{if(finished)return;finished=true;clearTimeout(flashTimer);sourceEnd=null;resolve(ok);}; sourceEnd=finish;
  const fallback=()=>{
   if(finished)return;
   if(token!==generation){finish(false);return;}
   $('source').textContent=question.prompt; $('source').classList.remove('masked');
   say('No local Mandarin voice is ready. Read this timed source, then repeat or retell from memory.');
   flashTimer=setTimeout(()=>finish(),Math.min(45000,Math.max(6500,question.prompt.length*260)));
  };
  const localVoices='speechSynthesis'in window?speechSynthesis.getVoices().filter(v=>v.localService&&/^zh[-_](CN|Hans)/i.test(v.lang)):[];
  if(!localVoices.length){fallback();return;}
  const u=new SpeechSynthesisUtterance(question.prompt);u.lang='zh-CN';u.voice=localVoices[0];u.rate=Number($('speed').value);
  u.onend=()=>finish();u.onerror=()=>{clearTimeout(flashTimer);fallback();};
  // A silent/stalled speech service must never hang an exam indefinitely.
  flashTimer=setTimeout(()=>{speechSynthesis.cancel();fallback();},Math.max(15000,question.prompt.length*700));
  try{speechSynthesis.speak(u);}catch{fallback();}
 });
}
async function enableMic(){
 if(micPending)return;
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;cancelAnimationFrame(meterFrame);analyser=null;void audioContext?.close();audioContext=null;$('waveform').getContext('2d').clearRect(0,0,900,70);$('mic-state').textContent='Microphone off';$('enable-mic').textContent='Enable microphone';$('recording-note').textContent='Microphone released. You can still replay and download completed takes.';return;}
 micPending=true; $('enable-mic').disabled=true;
 try{
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('This browser cannot record here. Use current Chrome, Edge, Firefox or Safari on HTTPS or localhost.');
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
  $('mic-state').textContent='Microphone ready'; $('enable-mic').textContent='Turn microphone off';
  $('recording-note').textContent='Recording starts with the speaking timer. Replays stay in this tab; download any take you want to keep.';
  try{audioContext=new (window.AudioContext||window.webkitAudioContext)();await audioContext.resume();analyser=audioContext.createAnalyser();analyser.fftSize=256;audioContext.createMediaStreamSource(stream).connect(analyser);drawMeter();}catch{say('Recording is ready. Audio visualization is unavailable in this browser.');}
 }catch(err){stream?.getTracks().forEach(t=>t.stop());stream=null;$('mic-state').textContent='Microphone unavailable';say(err.name==='NotAllowedError'?'Microphone permission was denied. Allow it in your browser’s site settings, then try again. You can also practice without recording.':err.message,true);}
 finally{micPending=false; $('enable-mic').disabled=active;}
}
function drawMeter(){
 if(!analyser)return;const canvas=$('waveform'),ctx=canvas.getContext('2d'),data=new Uint8Array(analyser.fftSize);
 const draw=()=>{analyser.getByteTimeDomainData(data);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--color-accent');ctx.lineWidth=2;ctx.beginPath();data.forEach((v,i)=>{const x=i/(data.length-1)*canvas.width,y=(v/255)*canvas.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();meterFrame=requestAnimationFrame(draw);};draw();
}
function startRecording(){
 if(!stream||!stream.getAudioTracks().some(t=>t.readyState==='live'))return;
 try{
  const type=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
  const chunks=[];const target=current;recorder=new MediaRecorder(stream,type?{mimeType:type}:undefined);
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const r=recorder;
  r.finished=new Promise(resolve=>{r.onstop=()=>{if(chunks.length)target.blob=new Blob(chunks,{type:r.mimeType||chunks[0].type});resolve();};r.onerror=()=>{say('Recording stopped unexpectedly. Continue the take and use self-review.',true);resolve();};});
  r.start(250);$('mic-state').textContent='Recording this take';$('mic-state').classList.add('live');
 }catch{say('Recording could not start. The timed drill continues without audio.',true);}
}
async function stopRecording(){
 const r=recorder;recorder=null;
 if(r){if(r.state!=='inactive'){r.requestData();r.stop();} await Promise.race([r.finished,new Promise(resolve=>setTimeout(resolve,1500))]);}
 $('mic-state').classList.remove('live');$('mic-state').textContent=stream?'Microphone ready':'Microphone off';
}
async function beginQuestion(token){
 if(token!==generation||!active)return;
 q=session[index];current={question:q,blob:null,saved:false,values:null,reflection:''};phase='';renderQuestion();
 $('session-counter').textContent=`Take ${index+1} of ${session.length}`;
 if(q.part==='repeat'){
  $('phase-label').textContent='Listen once';$('timer').textContent='—';
  const completed=await sourcePlayback(q,token); if(!completed||token!==generation||!active)return;
  if(mode==='exam'){$('source').textContent='Your turn. Repeat the sentence or retell the key facts from memory.';$('source').classList.add('masked');}
 }
 started=Date.now();tick(token);interval=setInterval(()=>tick(token),180);
}
function tick(token){
 if(token!==generation||!active)return;
 const p=C.phaseAt(q,Date.now()-started);$('timer').textContent=`${String(Math.floor(p.remaining/60)).padStart(2,'0')}:${String(p.remaining%60).padStart(2,'0')}`;
 if(p.phase!==phase){phase=p.phase;$('phase-label').textContent=phase==='prepare'?'Gather your thoughts':phase==='answer'?'Your turn. Speak.':'Take complete';
  if(phase==='answer'){startRecording();$('finish').hidden=mode==='exam';}
  if(phase==='done'){clearClock();void completeTake(token);}
 }
}
async function completeTake(token,aborted=false){
 if(closing||!active)return;closing=true;
 clearClock();$('finish').disabled=true;await stopRecording();if(token!==generation)return;
 if(current){current.aborted=aborted;attempts.push(current);current=null;}
 if(mode==='exam'&&!aborted&&index+1<session.length){index++;closing=false;await beginQuestion(token);}
 else{closing=false;setBusy(false);$('finish').disabled=false;$('phase-label').textContent=aborted?'Session ended':'Ready to review';$('timer').textContent='00:00';renderReview();say(`Saved ${attempts.length} take${attempts.length===1?'':'s'} in this tab. Listen back, then save a self-assessment for each.`);}
}
async function start(){
 if(active||micPending)return;if(!C.canAccess(q,pro())){say('Choose a free prompt or activate Pro.',true);return;}
 generation++;closing=false;cancelSource();clearClock();resetUrls();attempts=[];reviewIndex=0;$('review').hidden=true;$('playback').replaceChildren();
 session=mode==='exam'?C.accessible(filtered(),pro()):[q];index=0;
 if(!session.length){say('No unlocked prompts in this filter. Choose another skill, or activate Pro.');return;}
 if(mode==='exam'){const at=session.findIndex(x=>x.id===q.id);session=[...session.slice(Math.max(0,at)),...session.slice(0,Math.max(0,at))];}
 setBusy(true);say(stream?'Follow the timer. Your microphone is ready.':'This session will run without recording. For an audio take, end the session and enable your microphone first.');await beginQuestion(generation);
}
function renderReview(){
 $('review').hidden=!attempts.length;if(!attempts.length)return;
 $('review-select').innerHTML=attempts.map((a,i)=>`<option value="${i}">${i+1}. ${escape(a.question.title)}${a.aborted?' · ended early':''}${a.saved?' · reviewed':''}</option>`).join('');$('review-select').value=String(reviewIndex);
 const a=attempts[reviewIndex];if(playbackUrl){URL.revokeObjectURL(playbackUrl);urls.delete(playbackUrl);playbackUrl=null;}
 $('playback').replaceChildren();
 if(a.blob){playbackUrl=URL.createObjectURL(a.blob);urls.add(playbackUrl);const audio=document.createElement('audio');audio.controls=true;audio.src=playbackUrl;$('playback').append(audio);}else{$('playback').textContent='No audio for this take. You can still reflect on your response.';}
 $('download-audio').disabled=!a.blob;$('download-wav').disabled=!a.blob;
 $('rubric-fields').innerHTML=rubric.map(([name,desc],i)=>`<div class="rubric-row"><label for="rubric-${i}">${name}<span>${desc}</span></label><select required id="rubric-${i}"><option value="">Choose a rating</option>${[1,2,3,4,5].map(v=>`<option value="${v}" ${a.values?.[i]===v?'selected':''}>${v} · ${['','Needs work','Developing','Functional','Strong','Consistent'][v]}</option>`).join('')}</select></div>`).join('');$('reflection').value=a.reflection||'';
 $('rubric-form').querySelector('button[type=submit],button.primary').textContent=a.saved?'Update self-assessment':'Save self-assessment';scorePreview();
}
function values(){return rubric.map((_,i)=>Number($(`rubric-${i}`).value));}
function scorePreview(){try{$('score-preview').textContent=`${C.score(values())} / 100 · self-rated`;}catch{$('score-preview').textContent='Rate all five dimensions';}}
function saveReview(e){
 e.preventDefault();const a=attempts[reviewIndex];if(!a)return;
 try{const v=values(),score=C.score(v);a.values=v;a.reflection=$('reflection').value;a.saved=true;
  if(!a.historyId)a.historyId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
  saved.history=saved.history.filter(h=>h.id!==a.historyId);saved.history.push({id:a.historyId,date:dateKey(),at:new Date().toISOString(),questionId:a.question.id,title:a.question.title,level:a.question.level,mode,aborted:a.aborted||false,score,dimensions:v,reflection:a.reflection});saved.history=saved.history.slice(-200);
  const stored=persist();renderProgress();renderReview();if(stored)say('Self-assessment saved on this device. Pick another take to review, or start a new practice.');
 }catch(err){say(err.message,true);}
}
function download(blob,name){const url=URL.createObjectURL(blob);urls.add(url);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},10000);}
function extension(type){return type.includes('webm')?'webm':type.includes('mp4')?'m4a':type.includes('ogg')?'ogg':'bin';}
async function downloadWav(){
 const a=attempts[reviewIndex];if(!a?.blob)return;$('download-wav').disabled=true;
 let ctx;
 try{
  ctx=new (window.AudioContext||window.webkitAudioContext)();const audio=await ctx.decodeAudioData(await a.blob.arrayBuffer());const count=audio.length,channels=audio.numberOfChannels,rate=audio.sampleRate;
  const b=new ArrayBuffer(44+count*channels*2),v=new DataView(b);const str=(off,s)=>[...s].forEach((c,i)=>v.setUint8(off+i,c.charCodeAt(0)));
  str(0,'RIFF');v.setUint32(4,b.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,rate,true);v.setUint32(28,rate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,b.byteLength-44,true);
  const data=Array.from({length:channels},(_,i)=>audio.getChannelData(i));let off=44;for(let i=0;i<count;i++)for(let ch=0;ch<channels;ch++){const x=Math.max(-1,Math.min(1,data[ch][i]));v.setInt16(off,x<0?x*32768:x*32767,true);off+=2;}
  download(new Blob([b],{type:'audio/wav'}),`${a.question.id}.wav`);say('WAV prepared. Keep the downloaded file for your review.');
 }catch{say('This browser cannot convert this recording to WAV. Download the original audio instead.',true);}
 finally{await ctx?.close().catch(()=>{});$('download-wav').disabled=false;}
}
function renderProgress(){
 const h=saved.history,week=C.weekStats(h,dateKey());const days=week.filter(d=>d.count).length;
 $('progress-summary').textContent=h.length?`${h.length} saved self-assessments · ${days} active days this week · ${Math.round(h.reduce((s,r)=>s+r.score,0)/h.length)} / 100 average (self-rated)`:'Your first saved self-assessment starts your history.';
 $('heatmap').innerHTML=week.map(d=>`<div class="day" title="${d.date}: ${d.count} saved reviews"><span>${new Date(`${d.date}T12:00:00`).toLocaleDateString('en',{weekday:'narrow'})}</span><span class="day-box" data-count="${d.count>2?'many':d.count?'some':'none'}">${d.count||'–'}</span></div>`).join('');
 $('history').innerHTML=h.slice(-6).reverse().map(r=>`<div class="history-row"><div>${escape(r.title)}<small>${escape(r.date)} · Level ${r.level} · ${r.mode==='exam'?'Strict session':'Practice'}${r.aborted?' · ended early':''}${r.reflection?` · ${escape(r.reflection)}`:''}</small></div><span class="history-score">${r.score} / 100</span></div>`).join('');
}
function applyTheme(){document.documentElement.dataset.theme=saved.theme;$('theme').textContent=saved.theme==='dark'?'Light theme':'Dark theme';$('theme').setAttribute('aria-label',`Switch to ${saved.theme==='dark'?'light':'dark'} theme`);}
$('question-list').addEventListener('click',e=>{const b=e.target.closest('[data-q]');if(!b||active)return;const item=bank.find(x=>x.id===b.dataset.q);if(!C.canAccess(item,pro())){$('plans').scrollIntoView({behavior:'smooth'});$('license-key').focus({preventScroll:true});say('This prompt is in the Pro library. Your free prompts remain available.');return;}cancelSource();q=item;renderQuestion();});
for(const id of ['level','part'])$(id).addEventListener('change',()=>{cancelSource();const rows=filtered();q=rows.find(x=>C.canAccess(x,pro()))||rows[0];renderQuestion();$('start').disabled=!C.canAccess(q,pro());if(!C.canAccess(q,pro()))say('This level and skill has Pro prompts. Choose “All four skills” for free prompts.');});
$('practice-mode').onclick=()=>setMode('practice');$('exam-mode').onclick=()=>setMode('exam');
for(const id of ['show-pinyin','show-translation'])$(id).onchange=()=>renderQuestion();
$('listen').onclick=async()=>{if(active)return;$('listen').disabled=true;await sourcePlayback(q,generation);$('listen').disabled=mode==='exam';};
$('enable-mic').onclick=enableMic;$('start').onclick=start;
$('finish').onclick=()=>{if(active&&mode==='practice'&&phase==='answer'){clearClock();$('finish').hidden=true;void completeTake(generation);}};
$('abort').onclick=()=>{if(!active)return;cancelSource();void completeTake(generation,true);};
$('review-select').onchange=()=>{reviewIndex=Number($('review-select').value);renderReview();};$('rubric-fields').onchange=scorePreview;$('rubric-form').onsubmit=saveReview;
$('download-audio').onclick=()=>{const a=attempts[reviewIndex];if(a?.blob)download(a.blob,`${a.question.id}.${extension(a.blob.type)}`);};$('download-wav').onclick=downloadWav;
$('export-history').onclick=()=>download(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),history:saved.history},null,2)],{type:'application/json'}),'hsk30-practice-history.json');
let clearArmed=false;$('clear-history').onclick=()=>{if(!clearArmed){clearArmed=true;$('clear-history').textContent='Confirm clear history';setTimeout(()=>{clearArmed=false;$('clear-history').textContent='Clear history';},5000);return;}saved.history=[];persist();renderProgress();clearArmed=false;$('clear-history').textContent='Clear history';say('Practice history cleared on this device.');};
$('theme').onclick=()=>{saved.theme=saved.theme==='dark'?'light':'dark';applyTheme();persist();};
$('license-form').onsubmit=async e=>{e.preventDefault();if(active)return;const button=$('verify-license');button.disabled=true;button.textContent='Verifying…';$('license-message').textContent='Sending this key to Gumroad for verification…';
 try{saved.license=await C.verifyLicense($('license-key').value,{productId:HSK_CONFIG.productId,hostname:location.hostname});persist();$('license-key').value='';$('license-message').textContent=saved.license.source==='development'?'Local development Pro enabled. All 48 prompts are available.':'Pro activated. All 48 prompts are available offline in this browser.';renderQuestion();$('start').disabled=false;}
 catch(err){$('license-message').textContent=err.name==='AbortError'?'Verification timed out. Check your connection and try again.':err.message;}
 finally{button.disabled=false;button.textContent='Activate Pro';}};
$('deactivate').onclick=()=>{if(active)return;saved.license=null;persist();const rows=filtered();q=rows.find(x=>x.free)||bank.find(x=>x.level===q.level&&x.free);$('part').value='all';renderQuestion();$('start').disabled=false;$('license-message').textContent='Pro deactivated on this browser. Your practice history is kept.';};
if(/^https:\/\/[^\s]+\.gumroad\.com\/l\/|^https:\/\/gumroad\.com\/l\//.test(HSK_CONFIG.productUrl)){$('buy-link').href=HSK_CONFIG.productUrl;$('buy-link').hidden=false;$('buy-note').textContent='Checkout and downloads are handled by Gumroad.';}
if('speechSynthesis'in window)speechSynthesis.getVoices();
if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('./sw.js').then(()=>{navigator.serviceWorker.ready.then(()=>{$('offline-status').textContent='Offline copy saved on this device';});}).catch(()=>{$('offline-status').textContent='Offline cache unavailable · use a downloaded local copy';});
window.addEventListener('pagehide',()=>{generation++;clearClock();cancelSource();if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());cancelAnimationFrame(meterFrame);void audioContext?.close();resetUrls();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active&&interval)tick(generation);});
applyTheme();renderQuestion();renderProgress();
})();
