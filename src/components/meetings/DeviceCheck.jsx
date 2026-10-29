import { useEffect, useRef, useState } from 'react'
import { Camera, Mic, Square } from 'lucide-react'

export default function DeviceCheck() {
  const [camera, setCamera] = useState('idle')
  const [microphone, setMicrophone] = useState('idle')
  const [error, setError] = useState('')
  const [level, setLevel] = useState(0)
  const streams = useRef({})
  const pending = useRef({})
  const mounted = useRef(true)
  const video = useRef(null)
  const details = useRef(null)
  const audio = useRef(null)
  const meter = useRef(null)
  function stop(kind) {
    streams.current[kind]?.getTracks().forEach(track => track.stop())
    delete streams.current[kind]
    if (kind === 'audio') { clearInterval(meter.current); audio.current?.close?.().catch?.(() => {}); audio.current = null }
  }
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; stop('video'); stop('audio') }
  }, [])
  useEffect(() => { if (video.current) video.current.srcObject = streams.current.video || null }, [camera])
  async function test(kind) {
    if (pending.current[kind]) return
    const setState = kind === 'video' ? setCamera : setMicrophone
    if (streams.current[kind]) { stop(kind); setState('idle'); if (kind === 'audio') setLevel(0); return }
    if (!navigator.mediaDevices?.getUserMedia) { setError('Device preview is unavailable in this browser. You can still check devices on the meeting provider’s pre-join screen.'); return }
    pending.current[kind] = true; setError(''); setState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: kind === 'audio', video: kind === 'video' })
      if (!mounted.current || !details.current?.open) { stream.getTracks().forEach(track => track.stop()); if (mounted.current) setState('idle'); return }
      streams.current[kind] = stream; setState('ready')
      const Audio = window.AudioContext || window.webkitAudioContext
      if (kind === 'audio' && Audio) {
        const context = new Audio(); audio.current = context
        const analyser = context.createAnalyser(); analyser.fftSize = 256
        context.createMediaStreamSource(stream).connect(analyser)
        const values = new Uint8Array(analyser.fftSize)
        meter.current = setInterval(() => { analyser.getByteTimeDomainData(values); if (mounted.current) setLevel(Math.min(100, Math.max(...values.map(value => Math.abs(value - 128))) * 3)) }, 200)
      }
    } catch (cause) {
      if (!mounted.current) return
      stop(kind); setState('idle')
      setError(cause.name === 'NotAllowedError' ? 'Permission was not granted. Use your browser’s site settings to allow the camera or microphone, then retry. You may also join with devices off.' : 'The device could not be opened. Check that it is connected and not in use by another app, then retry.')
    } finally { pending.current[kind] = false }
  }
  return <details ref={details} className="device-check" onToggle={event => { if (!event.currentTarget.open) { stop('video'); stop('audio'); setCamera('idle'); setMicrophone('idle'); setLevel(0) } }}><summary>Check my camera and microphone</summary><p>This preview stays on your device. It does not join a call, record you or send media to the ministry.</p><div className="platform-actions"><button type="button" onClick={() => test('video')} disabled={camera === 'requesting'}>{camera === 'ready' ? <Square size={17} /> : <Camera size={17} />}{camera === 'requesting' ? 'Waiting for permission…' : camera === 'ready' ? 'Stop camera preview' : 'Preview camera'}</button><button type="button" onClick={() => test('audio')} disabled={microphone === 'requesting'}>{microphone === 'ready' ? <Square size={17} /> : <Mic size={17} />}{microphone === 'requesting' ? 'Waiting for permission…' : microphone === 'ready' ? 'Stop microphone check' : 'Test microphone'}</button></div>
    {camera === 'ready' && <video ref={video} autoPlay muted playsInline aria-label="Local camera preview" className="camera-preview" />}
    {microphone === 'ready' && <div><p role="status">Microphone connected. Speak and watch the input meter.</p><meter min="0" max="100" value={level} aria-label="Microphone input level" className="w-full" /></div>}
    {error && <p role="alert" className="device-error">{error}</p>}</details>
}
