const media = '/assets/campaigns/december-2026'
export const decemberCrusade = {
  dates: '7th–13th December 2026',
  time: '7–12 December · 5:00 PM daily. Final service, 13 December · closes at 12 noon (Nigeria time).',
  venue: "Christ’s Reformation House Int’l · Zoe Assembly",
  address: 'No. 8 Rainbow Street, Ayegbami, Sagamu, Ogun State, Nigeria.',
  message: 'Join us for seven powerful days of prayer, worship, healing, miracles, and encounters with God.',
  endsAt: Date.parse('2026-12-14T00:00:00+01:00'),
}
export const crusadeSlides = [
  { image: `${media}/landscape-flyer.webp`, smallImage: `${media}/landscape-flyer-960.webp`, alt: 'God of Wonder December Fire Crusade flyer with Apostle Anchord Taiwo in a white suit and gold tie, 7–12 December at 5 PM daily; final service closes at noon on 13 December, Sagamu.', label: 'God of Wonder', artwork: true },
  { image: `${media}/healing-prayer.webp`, smallImage: `${media}/healing-prayer-960.webp`, alt: 'Illustrative artwork of a minister seen from behind leading an African congregation in healing prayer.', label: 'Gather in prayer', illustration: true },
  { image: `${media}/corporate-prayer.webp`, smallImage: `${media}/corporate-prayer-960.webp`, alt: 'Illustrative artwork of worshippers praying toward a blue and gold crusade stage.', label: 'United in faith', illustration: true },
]
export function findCrusadeEvent(events) {
  return events.find(event => /god\s+of\s+wonder|december.*fire.*crusade|fire.*crusade.*december/i.test(event.title) && String(event.starts_at).startsWith('2026-12-07') && String(event.ends_at).slice(0,10) === '2026-12-13') || null
}
