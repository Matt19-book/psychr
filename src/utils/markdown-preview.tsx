import type { ReactNode } from 'react'

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const token = match[0]
    const key = `${match.index}-${token}`

    if (token.startsWith('`')) {
      nodes.push(
        <code key={key} className="bg-gray-100 px-1 rounded text-sm font-mono text-gray-800">
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    }

    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

export function renderMarkdownPreview(md: string): ReactNode[] {
  const lines = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const blocks: ReactNode[] = []

  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (i === 0 && line.trim() === '---') {
      const yamlLines: string[] = []
      i += 1
      while (i < lines.length && lines[i].trim() !== '---') {
        yamlLines.push(lines[i])
        i += 1
      }
      if (i < lines.length && lines[i].trim() === '---') i += 1
      blocks.push(
        <pre key={`yaml-${key++}`} className="bg-gray-100 rounded p-3 text-xs font-mono text-gray-700 mb-4 overflow-x-auto">
          {yamlLines.join('\n')}
        </pre>
      )
      continue
    }

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i += 1
      }
      if (i < lines.length) i += 1
      blocks.push(
        <pre key={`code-${key++}`} className="bg-gray-100 rounded p-3 text-xs font-mono text-gray-800 my-3 overflow-x-auto">
          {codeLines.join('\n')}
        </pre>
      )
      continue
    }

    if (!line.trim()) {
      i += 1
      continue
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const content = renderInline(headingMatch[2])
      const className = level === 1
        ? 'text-xl font-bold text-gray-900 mt-6 mb-3'
        : level === 2
          ? 'text-lg font-bold text-gray-800 mt-5 mb-2'
          : 'text-base font-bold text-gray-800 mt-4 mb-1'
      const Tag = `h${level}` as keyof JSX.IntrinsicElements
      blocks.push(<Tag key={`heading-${key++}`} className={className}>{content}</Tag>)
      i += 1
      continue
    }

    const paragraphLines = [line]
    i += 1
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !/^(#{1,3})\s+/.test(lines[i])
    ) {
      paragraphLines.push(lines[i])
      i += 1
    }

    blocks.push(
      <p key={`p-${key++}`} className="mb-3 text-sm leading-7 text-gray-800">
        {renderInline(paragraphLines.join(' '))}
      </p>
    )
  }

  return blocks
}
