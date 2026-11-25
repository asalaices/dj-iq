/* Local signal analysis; no audio leaves the browser. */
(function(root){
"use strict";
function analyze(samples,rate){
  if(!samples.length||!Number.isFinite(rate)||rate<1000)throw Error("Invalid audio");
  const hop=Math.max(1,Math.round(rate/100)), n=Math.min(Math.floor(samples.length/hop),18000);
  const envelope=new Float64Array(n), peaks=new Float32Array(720);
  let prev=0, power=0;
  for(let i=0;i<n;i++){
    let sum=0;
    for(let j=i*hop;j<(i+1)*hop;j++){const v=samples[j];sum+=v*v;}
    const rms=Math.sqrt(sum/hop);power+=sum;
    envelope[i]=Math.max(0,rms-prev);prev=rms;
  }
  for(let k=0;k<peaks.length;k++){
    const a=Math.floor(k*samples.length/peaks.length),b=Math.floor((k+1)*samples.length/peaks.length);
    let p=0;for(let j=a;j<b;j+=Math.max(1,Math.floor((b-a)/128)))p=Math.max(p,Math.abs(samples[j]));
    peaks[k]=p;
  }
  const hz=rate/hop, minLag=Math.round(hz*60/180),maxLag=Math.round(hz*60/70);
  let best=-Infinity, lag=0;
  const mean=envelope.reduce((a,b)=>a+b,0)/Math.max(1,n);
  let variance=0;for(const v of envelope)variance+=(v-mean)**2;
  if(n<hz*8||variance<1e-8)return {bpm:null,confidence:0,offset:null,peaks:Array.from(peaks),rms:Math.sqrt(power/Math.max(1,n*hop))};
  for(let l=minLag;l<=maxLag;l++){
    let ab=0,aa=0,bb=0;
    for(let i=l;i<n;i++){const a=envelope[i]-mean,b=envelope[i-l]-mean;ab+=a*b;aa+=a*a;bb+=b*b;}
    const score=ab/Math.sqrt(aa*bb||1);
    if(score>best){best=score;lag=l;}
  }
  if(best<.15)return {bpm:null,confidence:Math.max(0,best),offset:null,peaks:Array.from(peaks),rms:Math.sqrt(power/(n*hop))};
  const bins=new Float64Array(lag);for(let i=0;i<n;i++)bins[i%lag]+=envelope[i];
  let phase=0;for(let i=1;i<lag;i++)if(bins[i]>bins[phase])phase=i;
  return {bpm:Math.round(hz*60/lag*10)/10,confidence:Math.min(1,best),offset:phase/hz,peaks:Array.from(peaks),rms:Math.sqrt(power/(n*hop))};
}
function matchRate(target,source){if(!Number.isFinite(target)||!Number.isFinite(source)||target<=0||source<=0)throw Error("Analyze both tracks first");const ratio=target/source;if(ratio<.84||ratio>1.16)throw Error("Tempo difference exceeds 16%");return ratio;}
function phaseSeek(time,masterBpm,masterOffset,slaveTime,slaveBpm,slaveOffset){
  const mp=60/masterBpm,sp=60/slaveBpm,phase=((time-masterOffset)%mp+mp)%mp/mp;
  const nearest=Math.round((slaveTime-slaveOffset)/sp-phase);
  return Math.max(0,slaveOffset+(nearest+phase)*sp);
}
const api={analyze,matchRate,phaseSeek};
if(typeof module!=="undefined")module.exports=api;else root.DJAnalysis=api;
})(typeof globalThis!=="undefined"?globalThis:this);
