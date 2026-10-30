const prayerSections = [ ['A. Prayer for the individual','individualPrayers'], ['B. Prayer for the family','familyPrayers'], ['C. Prayer for the Church','churchPrayers'], ['D. Prayer for Nigeria and the world','nationsPrayers'], ["E. Prayer for Christ’s Reformation House Int’l Inc.",'ministryPrayers'] ]
function Text({ children }) { return <div className="dev-text">{String(children || '').split(/\n\s*\n/).map((p,i) => <p key={i}>{p}</p>)}</div> }
function Points({ items }) { return <ol>{(items || []).map((p,i) => <li key={i}>{p}</li>)}</ol> }
export default function DevotionalReading({ entry:c }) {
  return <article className="dev-reading">
    <p className="dev-eyebrow">CHRIST’S REFORMATION HOUSE INT’L INC.</p>
    <p>{c.publicationDate} · {c.monthlyTheme}</p>
    <h1>Day {c.dayNumber}: {c.title}</h1>
    <p className="dev-lead">Theme: {c.dailyTheme}</p>
    <h2>Main Bible text</h2><p><strong>{c.mainReference} ({c.translation})</strong></p><blockquote className="dev-passage">{c.mainPassage}</blockquote>
    <p><strong>Supporting scriptures:</strong> {(c.supportingReferences || []).join('; ')}</p>
    <p><strong>Central spiritual truth:</strong> {c.centralTruth}</p>
    <h2>Inspirational message: {c.messageTitle}</h2><Text>{c.message}</Text>
    <h2>Key spiritual points</h2><Points items={c.keyLessons}/>
    <h2>Life applications</h2><ul>{Object.entries(c.applications || {}).map(([key,value]) => <li key={key}><strong>{{personal:'Personal life',family:'Family',work:'Work and business',relationships:'Relationships',service:'Ministry',spiritualGrowth:'Spiritual growth'}[key] || key}:</strong> {value}</li>)}</ul>
    <h2>Faith declaration</h2><Text>{c.declaration}</Text>
    <h2>Life-changing prayer points</h2>{prayerSections.map(([title,key]) => <section key={key}><h3>{title}</h3><Points items={c[key]}/></section>)}
    <h2>Today’s practical assignment</h2><Text>{c.dailyAction}</Text>
    <h2>Closing prayer</h2><Text>{c.closingPrayer}</Text>
    <div className="dev-reflection"><p><strong>Memory verse: {c.memoryReference}</strong></p><p>{c.memoryVerse}</p><p><strong>Today’s reflection:</strong> {c.reflectionQuestion}</p></div>
    <p><strong>Share today’s devotional:</strong> Encourage someone by sharing this message and praying with them.</p>
  </article>
}
