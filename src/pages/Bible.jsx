import { Link, useSearchParams } from 'react-router-dom'
import BibleReader from '../components/BibleReader'
import MetaTags from '../components/MetaTags'
import { parseScripture } from '../utils/scripture.mjs'
import '../styles/broadcast.css'
import '../styles/scripture.css'

export default function Bible() {
  const [params] = useSearchParams()
  const requested = params.get('reference')
  const passage = parseScripture(requested)
  return <div className="bible-page">
    <MetaTags title={passage ? `${passage.reference} — Bible` : 'Read the Bible'} description="Read and share the King James Version Bible on the ministry website." />
    <Link to="/">← Ministry homepage</Link>
    <h1>{passage?.reference || 'Read the Bible'}</h1>
    <p>King James Version · Choose a book, chapter or verse to continue reading.</p>
    {requested && !passage && <p className="bible-invalid" role="alert">We could not recognise that reference. Choose the passage using the controls below.</p>}
    <BibleReader key={passage?.reference || 'browse'} initialPassage={passage} />
  </div>
}
