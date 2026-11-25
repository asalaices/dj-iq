"use strict";
const el=id=>document.getElementById(id);
const decks=["A","B"].map(id=>({id,audio:el("audio"+id),url:null,analysis:null,job:0,worker:null}));
let ctx=null,gains=[];
for(const d of decks){el("file"+d.id).addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;d.audio.pause();if(d.url)URL.revokeObjectURL(d.url);d.url=URL.createObjectURL(f);d.audio.src=d.url;el("name"+d.id).textContent=f.name;d.audio.playbackRate=1;el("rate"+d.id).value=100;el("rateValue"+d.id).textContent="100%";analyzeFile(d,f);});}
function mix(){const x=Number(el("fade").value)/100;el("mix").textContent=Math.round(x*100)+"%";if(ctx){gains[0].gain.setTargetAtTime(Math.cos(x*Math.PI/2),ctx.currentTime,.02);gains[1].gain.setTargetAtTime(Math.sin(x*Math.PI/2),ctx.currentTime,.02);}}
el("fade").addEventListener("input",mix);
el("enable").addEventListener("click",async()=>{try{if(!ctx){ctx=new AudioContext();for(const d of decks){const g=ctx.createGain();ctx.createMediaElementSource(d.audio).connect(g).connect(ctx.destination);gains.push(g);}mix();}await ctx.resume();el("audioStatus").textContent="Mixer enabled";}catch(e){el("audioStatus").textContent="Mixer unavailable: "+e.message;}});
async function post(path,data){const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const x=await r.json();if(!r.ok)throw Error(x.error);return x;}
fetch("/api/settings").then(r=>r.json()).then(x=>{el("theme").value=x.theme;document.documentElement.dataset.theme=x.theme;}).catch(()=>{});
el("theme").addEventListener("change",async e=>{document.documentElement.dataset.theme=e.target.value;try{await post("/api/settings",{theme:e.target.value});}catch{el("audioStatus").textContent="Theme preference not saved";}});
el("ask").addEventListener("click",async()=>{el("ask").disabled=true;el("advice").textContent="Planning…";try{const x=await post("/api/plan",{provider:el("provider").value,model:el("model").value,prompt:el("prompt").value});el("advice").textContent=x.advice;}catch(e){el("advice").textContent=e.message;}finally{el("ask").disabled=false;}});

function draw(d){
 const canvas=el("wave"+d.id), c=canvas.getContext("2d"),w=canvas.width,h=canvas.height;
 c.clearRect(0,0,w,h);if(!d.analysis)return;
 const color=getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
 c.fillStyle=color;
 d.analysis.peaks.forEach((p,i)=>{const v=Math.max(1,p*h*.46);c.fillRect(i*w/d.analysis.peaks.length,h/2-v,1,2*v);});
 if(Number.isFinite(d.audio.duration)&&d.audio.duration>0){c.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--text").trim();c.fillRect(d.audio.currentTime/d.audio.duration*w,0,2,h);}
}
async function analyzeFile(d,file){
 const job=++d.job;if(d.worker){d.worker.terminate();d.worker=null;}d.analysis=null;draw(d);
 const status=el("analysis"+d.id);status.textContent="Analyzing locally…";
 if(file.size>80*1024*1024){status.textContent="Analysis skipped: file exceeds 80 MB. Playback remains available.";return;}
 let decoder;
 try{
  decoder=new OfflineAudioContext(1,1,11025);
  const decoded=await decoder.decodeAudioData(await file.arrayBuffer());
  if(job!==d.job)return;
  const samples=decoded.getChannelData(0).slice();
  const worker=new Worker("/analysis-worker.js");d.worker=worker;
  worker.onmessage=e=>{worker.terminate();if(job!==d.job)return;d.worker=null;if(e.data.error){status.textContent=e.data.error;return;}d.analysis=e.data.result;const a=d.analysis;status.textContent=a.bpm?("Estimated "+a.bpm+" BPM · correlation "+a.confidence.toFixed(2)):"Tempo uncertain — manual mixing available";draw(d);};
  worker.onerror=()=>{worker.terminate();if(job===d.job){d.worker=null;status.textContent="Analysis failed; playback remains available.";}};
  worker.postMessage({samples:samples.buffer,rate:decoded.sampleRate},[samples.buffer]);
 }catch(e){if(job===d.job)status.textContent="Analysis unavailable: "+e.message;}
}
function setRate(d,r){d.audio.preservesPitch=true;d.audio.playbackRate=r;el("rate"+d.id).value=r*100;el("rateValue"+d.id).textContent=(r*100).toFixed(1)+"%";}
for(const d of decks){el("rate"+d.id).addEventListener("input",e=>setRate(d,Number(e.target.value)/100));d.audio.addEventListener("timeupdate",()=>draw(d));}
el("theme").addEventListener("change",()=>decks.forEach(draw));
el("sync").addEventListener("click",()=>{try{const [a,b]=decks;const r=DJAnalysis.matchRate(a.analysis?.bpm*a.audio.playbackRate,b.analysis?.bpm);setRate(b,r);el("audioStatus").textContent="B tempo matched to estimated A tempo; check by ear.";}catch(e){el("audioStatus").textContent=e.message;}});
el("align").addEventListener("click",()=>{try{const [a,b]=decks;if(!a.analysis?.bpm||!b.analysis?.bpm||!Number.isFinite(b.audio.duration))throw Error("Analyze both tracks first");if(!b.audio.paused)throw Error("Pause deck B before aligning");const seek=DJAnalysis.phaseSeek(a.audio.currentTime,a.analysis.bpm,a.analysis.offset,b.audio.currentTime,b.analysis.bpm,b.analysis.offset);b.audio.currentTime=Math.min(b.audio.duration,seek);el("audioStatus").textContent="B cue aligned to estimated A phase at this instant; start manually.";}catch(e){el("audioStatus").textContent=e.message;}});
