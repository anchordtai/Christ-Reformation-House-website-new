import { Children, Fragment, cloneElement, isValidElement } from 'react'
import { parseScripture, scriptureMatches, scriptureUrl } from '../utils/scripture.mjs'
import '../styles/scripture.css'

export default function ScriptureText({ children }) {
  const text = String(children ?? '')
  const matches = scriptureMatches(text)
  if (!matches.length) return text
  const result = []
  let end = 0
  for (const match of matches) {
    result.push(text.slice(end, match.index))
    result.push(<a key={match.index} className="scripture-link" href={scriptureUrl(match.reference)} aria-label={`Read ${match.text} in the Bible`}>{match.text}</a>)
    end = match.index + match.text.length
  }
  result.push(text.slice(end))
  return result
}

const skip = new Set(['a', 'button', 'input', 'textarea', 'select', 'option', 'code', 'pre', 'script', 'style', 'svg', 'math'])
function linkChildren(children) {
  return Children.map(children, child => {
    if (typeof child === 'string') return <ScriptureText>{child}</ScriptureText>
    if (!isValidElement(child) || (typeof child.type !== 'string' && child.type !== Fragment) || skip.has(child.type) || child.props['data-bible-ignore']) return child
    return child.props.children === undefined ? child : cloneElement(child, undefined, linkChildren(child.props.children))
  })
}

export function ScriptureContent({ children }) {
  return <>{linkChildren(children)}</>
}

export function ScripturePassage({ reference, children }) {
  const passage = parseScripture(reference)
  return passage ? <a className="scripture-link" href={scriptureUrl(passage.reference)} aria-label={`Read ${reference} in the Bible`}>{children}</a> : children
}
