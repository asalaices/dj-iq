importScripts("/analysis.js");
self.onmessage=e=>{try{self.postMessage({result:DJAnalysis.analyze(new Float32Array(e.data.samples),e.data.rate)});}catch(err){self.postMessage({error:err.message});}};
