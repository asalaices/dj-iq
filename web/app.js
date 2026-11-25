"use strict";
const el=id=>document.getElementById(id);
const decks=["A","B"].map(id=>({id,audio:el("audio"+id),url:null}));
let ctx=null,gains=[];
for(const d of decks){el("file"+d.id).addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;d.audio.pause();if(d.url)URL.revokeObjectURL(d.url);d.url=URL.createObjectURL(f);d.audio.src=d.url;el("name"+d.id).textContent=f.name;});}
function mix(){const x=Number(el("fade").value)/100;el("mix").textContent=Math.round(x*100)+"%";if(ctx){gains[0].gain.setTargetAtTime(Math.cos(x*Math.PI/2),ctx.currentTime,.02);gains[1].gain.setTargetAtTime(Math.sin(x*Math.PI/2),ctx.currentTime,.02);}}
el("fade").addEventListener("input",mix);
el("enable").addEventListener("click",async()=>{try{if(!ctx){ctx=new AudioContext();for(const d of decks){const g=ctx.createGain();ctx.createMediaElementSource(d.audio).connect(g).connect(ctx.destination);gains.push(g);}mix();}await ctx.resume();el("audioStatus").textContent="Mixer enabled";}catch(e){el("audioStatus").textContent="Mixer unavailable: "+e.message;}});
async function post(path,data){const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const x=await r.json();if(!r.ok)throw Error(x.error);return x;}
fetch("/api/settings").then(r=>r.json()).then(x=>{el("theme").value=x.theme;document.documentElement.dataset.theme=x.theme;}).catch(()=>{});
el("theme").addEventListener("change",async e=>{document.documentElement.dataset.theme=e.target.value;try{await post("/api/settings",{theme:e.target.value});}catch{el("audioStatus").textContent="Theme preference not saved";}});
el("ask").addEventListener("click",async()=>{el("ask").disabled=true;el("advice").textContent="Planning…";try{const x=await post("/api/plan",{provider:el("provider").value,model:el("model").value,prompt:el("prompt").value});el("advice").textContent=x.advice;}catch(e){el("advice").textContent=e.message;}finally{el("ask").disabled=false;}});
