import books from '../content/bible-books.json'

const commonAliases = {
  Genesis: ['Gen'], Exodus: ['Ex', 'Exod'], Leviticus: ['Lev'], Numbers: ['Num'], Deuteronomy: ['Deut'],
  Joshua: ['Josh'], Judges: ['Judg'], '1 Samuel': ['1 Sam'], '2 Samuel': ['2 Sam'],
  '1 Chronicles': ['1 Chron', '1 Chr'], '2 Chronicles': ['2 Chron', '2 Chr'], Nehemiah: ['Neh'],
  Psalms: ['Psalm', 'Ps', 'Psa'], Proverbs: ['Prov'], Ecclesiastes: ['Eccl'],
  'Song of Solomon': ['Song of Songs'], Isaiah: ['Isa'], Jeremiah: ['Jer'], Lamentations: ['Lam'],
  Ezekiel: ['Ezek'], Daniel: ['Dan'], Matthew: ['Matt', 'Mt'], Mark: ['Mk'], Luke: ['Lk'], John: ['Jn'],
  Romans: ['Rom'], '1 Corinthians': ['1 Cor'], '2 Corinthians': ['2 Cor'], Galatians: ['Gal'],
  Ephesians: ['Eph'], Philippians: ['Phil'], Colossians: ['Col'],
  '1 Thessalonians': ['1 Thess'], '2 Thessalonians': ['2 Thess'], '1 Timothy': ['1 Tim'], '2 Timothy': ['2 Tim'],
  Philemon: ['Philem'], Hebrews: ['Heb'], James: ['Jas'], '1 Peter': ['1 Pet'], '2 Peter': ['2 Pet'],
  '1 John': ['1 Jn'], '2 John': ['2 Jn'], '3 John': ['3 Jn'], Revelation: ['Rev', 'Revelations'],
}
const normalise = text => text.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
const aliases = new Map()
for (const book of books) {
  for (const name of [book.name, ...(commonAliases[book.name] || [])]) {
    aliases.set(normalise(name), book)
    const numbered = name.match(/^([1-3]) (.+)$/)
    if (numbered) aliases.set(normalise(`${['', 'I', 'II', 'III'][+numbered[1]]} ${numbered[2]}`), book)
  }
}
const escapedNames = [...aliases.keys()].sort((a, b) => b.length - a.length).map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'))
const pattern = `\\b(${escapedNames.join('|')})\\.?\\s+(\\d{1,3})(?::(\\d{1,3})(?:\\s*[-–—]\\s*(?:(\\d{1,3}):)?(\\d{1,3}))?)?\\b`

export function scriptureMatches(text) {
  const matches = []
  for (const match of String(text).matchAll(new RegExp(pattern, 'gi'))) {
    const book = aliases.get(normalise(match[1]))
    const chapter = +match[2], verse = match[3] ? +match[3] : null
    const endChapter = match[4] ? +match[4] : chapter
    const endVerse = match[5] ? +match[5] : verse
    if (!chapter || chapter > book.chapters || endChapter < chapter || endChapter > book.chapters || (verse !== null && (!verse || !endVerse || (endChapter === chapter && endVerse < verse)))) continue
    const reference = `${book.name} ${chapter}${verse ? `:${verse}${endChapter !== chapter ? `–${endChapter}:${endVerse}` : endVerse !== verse ? `–${endVerse}` : ''}` : ''}`
    matches.push({ index: match.index, text: match[0], book: book.id, chapter, verse, endChapter, endVerse, reference })
  }
  return matches
}

export function parseScripture(reference) {
  if (typeof reference !== 'string' || reference.length > 160) return null
  const text = reference.trim().replace(/\s*\((?:KJV|NIV|NKJV|ESV)\)$/i, '')
  return scriptureMatches(text).find(match => match.index === 0 && match.text.length === text.length) || null
}

export const scriptureUrl = reference => `/bible?reference=${encodeURIComponent(reference)}`
