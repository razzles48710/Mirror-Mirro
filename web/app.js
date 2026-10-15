const $ = id => document.getElementById(id);
let history = [], busy = false;
function state(value, label) { $('mirror').dataset.state = value; $('status').textContent = label; }
function browserVoice(text) {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) return resolve();
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = .88; speech.pitch = .7;
    speech.onstart = () => state('speaking', 'The mirror speaks');
    speech.onend = speech.onerror = resolve;
    window.speechSynthesis.speak(speech);
  });
}
async function speak(text) {
  let url;
  try {
    const response = await fetch('/api/tts', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text})});
    if (!response.ok) throw new Error('Use browser voice');
    url = URL.createObjectURL(await response.blob());
    const audio = new Audio(url);
    await new Promise((resolve,reject) => {audio.onended=resolve; audio.onerror=reject; audio.onplaying=()=>state('speaking','The mirror speaks');audio.play().catch(reject);});
  } catch { await browserVoice(text); }
  finally { if(url) URL.revokeObjectURL(url); }
}

let awake=false, armed=false, stream, context, source, processor, sending=false, idleTimer;
function sleep(){awake=false;history=[];document.body.classList.add('asleep');clearTimeout(idleTimer);state('idle',armed?'Say “magic mirror on the wall”':'Click Enable mirror to begin');}
function touch(){clearTimeout(idleTimer);if(awake&&!busy) idleTimer=setTimeout(sleep,60000);}
async function resetVoice(){const r=await fetch('/api/voice/reset',{method:'POST',body:'{}'});if(!r.ok) throw new Error('Wake listening unavailable. Install vosk and set VOSK_MODEL; see README.');}
async function wake(){
  awake=true;document.body.classList.remove('asleep');busy=true;
  try{await speak('I am here. What would you ask of your magic mirror?');if(armed)await resetVoice();}
  catch(error){$('answer').textContent=error.message;}
  finally{busy=false;state('idle','Ask your question aloud');touch();}
}
function snapshot(){
  const video=$('camera');if(!$('vision').checked||!stream||!video.videoWidth)return null;
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=Math.round(640*video.videoHeight/video.videoWidth);
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg',.75).split(',')[1];
}
async function ask(question){
  if(busy)return;awake=true;document.body.classList.remove('asleep');busy=true;clearTimeout(idleTimer);$('ask').disabled=true;
  state('thinking','The mirror is pondering…');$('answer').textContent='';
  try{
    const messages=[...history,{role:'user',content:question}].slice(-19);
    const image=snapshot();
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages,image})});
    const result=await response.json();if(!response.ok)throw new Error(result.error);
    history=[...messages,{role:'assistant',content:result.text}].slice(-18);
    $('answer').textContent=result.text;$('question').value='';await speak(result.text);
  }catch(error){$('answer').textContent=error.message;}
  finally{
    if(armed){try{await resetVoice();}catch(error){stop();$('answer').textContent=error.message;}}
    busy=false;$('ask').disabled=false;state('idle',armed?'Listening for your next question':'Type your next question');touch();
  }
}
async function heard(text){
  if(!text||busy)return;
  text=text.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
  if(!awake){
    const phrase='magic mirror on the wall';const index=text.indexOf(phrase);
    if(index!==-1){const rest=text.slice(index+phrase.length).trim();if(rest)await ask(rest);else await wake();}
  }else if(text.includes('go to sleep'))sleep();
  else {touch();await ask(text);}
}
// Capture mono PCM locally. Linear resampling supports browser-selected input rates.
function pcm16(samples,rate){
  const count=Math.floor(samples.length*16000/rate), bytes=new ArrayBuffer(count*2), view=new DataView(bytes);
  for(let i=0;i<count;i++){
    const pos=i*rate/16000,a=Math.floor(pos),fraction=pos-a;
    const value=samples[a]*(1-fraction)+samples[Math.min(a+1,samples.length-1)]*fraction;
    view.setInt16(i*2,Math.max(-1,Math.min(1,value))*32767,true);
  }return bytes;
}
function stop(){
  armed=false;if(processor){processor.disconnect();processor.onaudioprocess=null;}if(source)source.disconnect();
  if(stream)stream.getTracks().forEach(track=>track.stop());if(context)context.close().catch(()=>{});
  stream=null;$('camera').srcObject=null;$('enable').disabled=false;sleep();
}
$('enable').onclick=async()=>{
  $('enable').disabled=true;
  try{
    await resetVoice();
    stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480},audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
    $('camera').srcObject=stream;
    context=new AudioContext();await context.resume();source=context.createMediaStreamSource(stream);
    // ScriptProcessor is widely supported in desktop kiosks; no external scripts/CDNs.
    processor=context.createScriptProcessor(4096,1,1);source.connect(processor);processor.connect(context.destination);
    armed=true;sleep();
    processor.onaudioprocess=async event=>{
      if(!armed||busy||sending)return; // drop speech during playback; avoid self-triggering
      const bytes=pcm16(event.inputBuffer.getChannelData(0),context.sampleRate);sending=true;
      try{
        const response=await fetch('/api/listen',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:bytes});
        if(!response.ok)throw new Error('Local speech recognition stopped. Check Vosk setup and enable again.');
        const result=await response.json();await heard(result.text);
      }catch(error){stop();$('answer').textContent=error.message;document.body.classList.remove('asleep');}
      finally{sending=false;}
    };
  }catch(error){stop();$('answer').textContent=error.message;document.body.classList.remove('asleep');}
};
$('form').onsubmit=event=>{event.preventDefault();const text=$('question').value.trim();if(text)ask(text);};
$('stop').onclick=stop;
$('sleep').onclick=()=>{if(!busy)sleep();};
$('reset').onclick=()=>{if(!busy){history=[];$('answer').textContent='';touch();}};
$('full').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{});
window.addEventListener('pagehide',stop);
sleep();
