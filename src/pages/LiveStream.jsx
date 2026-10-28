import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { liveStreamService } from '../services/api'
import VideoPlayer from '../components/live-stream/VideoPlayer'
import DonationCTA from '../components/live-stream/DonationCTA'
import Loading from '../components/Loading'
import Error from '../components/Error'
export default function LiveStream() {
  const { data, loading, error, refetch } = useApi(liveStreamService.getStatus, [])
  return <div className="min-h-screen bg-slate-50"><section className="section-padding bg-slate-950 text-white"><div className="container-custom"><h1 className="text-4xl font-bold">Online service</h1><p className="mt-4 text-slate-300">Gather with the ministry wherever you are.</p></div></section><section className="section-padding"><div className="container-custom">{loading ? <Loading /> : error ? <><Error message={error} /><button className="btn-primary mt-4" onClick={refetch}>Retry</button></> : <><VideoPlayer url={data?.url} /><div className="my-6 flex flex-wrap gap-4"><Link className="btn-secondary" to="/prayer-request">Request prayer</Link>{data?.url && <a className="btn-secondary" href={data.url} target="_blank" rel="noopener noreferrer">Open provider page and conversation</a>}</div><DonationCTA /></>}</div></section></div>
}
