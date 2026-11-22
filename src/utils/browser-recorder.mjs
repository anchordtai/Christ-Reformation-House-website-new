export function recordingMime(Recorder=globalThis.MediaRecorder){return ['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(v=>Recorder?.isTypeSupported(v))||''}
// The raw mix and processed copy are encoded independently. No audio is sent to AI providers.
export async function beginBrowserRecording({source='microphone',onChunk,onState,onFailure}){
 const mime=recordingMime();if(!mime||!navigator.mediaDevices?.getUserMedia)throw Error('Recording is unavailable in this browser. Use a supported browser or upload an existing file.')
 let display,microphone,context;const recorders=[],streams=[];let stopped=false,failed=false,paused=false;
 const cleanup=()=>{streams.forEach(s=>s.getTracks().forEach(t=>t.stop()));context?.close().catch(()=>{})}
 try{
  if(source==='tab'){display=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});streams.push(display);if(!display.getAudioTracks().length)throw Error('No tab audio was shared. Select this meeting tab and enable Share tab audio, or use microphone recording.')}
  microphone=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:false},video:false});streams.push(microphone)
  context=new AudioContext();await context.resume();
  const original=context.createMediaStreamDestination(),enhanced=context.createMediaStreamDestination(),mix=context.createGain();mix.gain.value=display?0.65:1;
  for(const stream of streams){const audio=new MediaStream(stream.getAudioTracks());context.createMediaStreamSource(audio).connect(mix)}
  mix.connect(original);const high=context.createBiquadFilter();high.type='highpass';high.frequency.value=85;
  const low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=7500;
  const compressor=context.createDynamicsCompressor();compressor.threshold.value=-24;compressor.knee.value=18;compressor.ratio.value=3;compressor.attack.value=.008;compressor.release.value=.25;
  const gain=context.createGain();gain.gain.value=1.15;mix.connect(high).connect(low).connect(compressor).connect(gain).connect(enhanced);
  const chunks={original:[],enhanced:[]},counts={original:0,enhanced:0},sizes={original:0,enhanced:0},saves=[];
  let resolveDone;const done=new Promise(r=>{resolveDone=r});let finished=0;
  function stop(){if(stopped)return done;stopped=true;onState?.('finalizing');for(const r of recorders)if(r.state!=='inactive')r.stop();return done}
  for(const [kind,stream]of [['original',original.stream],['enhanced',enhanced.stream]]){
   const recorder=new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:48000});recorders.push(recorder);
   recorder.ondataavailable=event=>{if(!event.data.size)return;chunks[kind].push(event.data);sizes[kind]+=event.data.size;saves.push(Promise.resolve(onChunk?.(kind,counts[kind]++,event.data)).catch(()=>{onFailure?.('Recovery storage is full. Do not close this tab before downloading both recordings.')}));if(sizes[kind]>18*1024*1024){onFailure?.('Recording stopped at the free upload safety limit. Continue as a new sermon part.');stop()}};
   recorder.onerror=()=>{failed=true;onFailure?.('Recording was interrupted. Partial audio is retained for review.');stop()};
   recorder.onstop=async()=>{finished++;if(finished===2){await Promise.allSettled(saves);cleanup();const result={original:new Blob(chunks.original,{type:mime}),enhanced:new Blob(chunks.enhanced,{type:mime}),mime,complete:!failed};resolveDone(result);onState?.('stopped',result)}};
   recorder.start(2000);
  }
  for(const stream of streams)for(const track of stream.getTracks())track.addEventListener('ended',()=>{if(!stopped){failed=true;onFailure?.('Capture ended. Review the recovered audio before publication.');stop()}});
  onState?.('recording');return {stop,pause(){if(stopped||paused)return;paused=true;recorders.forEach(r=>r.pause());onState?.('paused')},resume(){if(stopped||!paused)return;paused=false;recorders.forEach(r=>r.resume());onState?.('recording')},get paused(){return paused},mime};
 }catch(error){cleanup();throw error}
}
