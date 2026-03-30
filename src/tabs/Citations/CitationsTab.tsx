/**
 * Tab 6: Citation Manager
 *
 * DOI-to-APA reference manager. Paste a DOI, get an APA-7 citation.
 * Searchable library, export to .txt or BibTeX.
 */

import { useState } from 'react'
import { usePsychrStore, Citation } from '../../store'
import { WorkspaceLayout, PanelHeader } from '../../components/layout/WorkspaceLayout'

export function CitationsTab() {
  const citations = usePsychrStore((s) => s.citations)
  const addCitation = usePsychrStore((s) => s.addCitation)
  const removeCitation = usePsychrStore((s) => s.removeCitation)

  const [doi, setDoi] = useState('')
  const [isLooking, setIsLooking] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const handleLookupDOI = async () => {
    if (!doi.trim()) return
    setIsLooking(true)
    setLookupError('')

    try {
      // CrossRef API — free, no auth required
      const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, '').trim()
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`)

      if (!res.ok) {
        setLookupError('DOI not found. Check for typos.')
        return
      }

      const json = await res.json()
      const work = json.message

      const authors = (work.author || []).map((a: { family?: string; given?: string }) =>
        a.family
          ? `${a.family}, ${(a.given || '').split(' ').map((n: string) => n[0]).filter(Boolean).join('. ')}.`
          : a.given || 'Unknown'
      )

      const year = work.published?.['date-parts']?.[0]?.[0]
        ?? work['published-print']?.['date-parts']?.[0]?.[0]
        ?? work['published-online']?.['date-parts']?.[0]?.[0]
        ?? new Date().getFullYear()

      const title = Array.isArray(work.title) ? work.title[0] : work.title || 'Untitled'
      const journal = work['container-title']?.[0] ?? work.publisher ?? ''
      const volume = work.volume ?? ''
      const issue = work.issue ? `(${work.issue})` : ''
      const pages = work.page ?? ''
      const url = work.URL ? `https://doi.org/${cleanDoi}` : undefined

      // APA-7 format: Author, A. A., & Author, B. B. (Year). Title. Journal, vol(issue), pages. https://doi.org/...
      const authorStr = authors.length > 1
        ? authors.slice(0, -1).join(', ') + ', & ' + authors.slice(-1)
        : authors[0] || 'Unknown Author'
      const apaString = [
        `${authorStr} (${year}). ${title}.`,
        journal && `${journal}${volume ? `, ${volume}${issue}` : ''}${pages ? `, ${pages}` : ''}.`,
        url && url,
      ].filter(Boolean).join(' ')

      const citation: Citation = {
        id: `cit_${Date.now()}`,
        doi: cleanDoi,
        authors,
        year: Number(year),
        title,
        journal,
        volume,
        issue: work.issue,
        pages,
        url,
        apaString,
        addedAt: new Date(),
      }

      addCitation(citation)
      setDoi('')
    } catch (err) {
      setLookupError('Network error — check your internet connection.')
    } finally {
      setIsLooking(false)
    }
  }

  const handleCopy = (citation: Citation) => {
    navigator.clipboard.writeText(citation.apaString).then(() => {
      setCopied(citation.id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const handleExport = () => {
    const text = citations.map((c) => c.apaString).join('\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'references.txt'
    a.click()
  }

  const filtered = search
    ? citations.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.authors.join(' ').toLowerCase().includes(search.toLowerCase()) ||
        c.journal?.toLowerCase().includes(search.toLowerCase())
      )
    : citations

  return (
    <WorkspaceLayout
      left={undefined}
      center={
        <div className="flex flex-col h-full bg-white">
          <PanelHeader
            title="Citation Manager"
            subtitle="DOI → APA-7 in one step"
            actions={
              citations.length > 0 ? (
                <button
                  onClick={handleExport}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded"
                >
                  Export .txt
                </button>
              ) : undefined
            }
          />

          {/* DOI Lookup */}
          <div className="px-6 py-4 border-b border-gray-200 bg-psychr-accent">
            <p className="text-sm font-medium text-gray-800 mb-2">Add by DOI</p>
            <div className="flex gap-2">
              <input
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookupDOI()}
                placeholder="10.1037/0003-066X.59.1.29 or full DOI URL…"
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-psychr-midblue"
              />
              <button
                onClick={handleLookupDOI}
                disabled={isLooking || !doi.trim()}
                className="px-4 py-2 bg-psychr-midblue text-white text-sm font-medium rounded-lg hover:bg-psychr-blue transition-colors disabled:opacity-50"
              >
                {isLooking ? '…' : 'Look up'}
              </button>
            </div>
            {lookupError && (
              <p className="text-xs text-red-600 mt-1.5">{lookupError}</p>
            )}
            <p className="text-xs text-gray-500 mt-1.5">
              Powered by CrossRef API · APA 7th edition format
            </p>
          </div>

          {/* Search */}
          {citations.length > 0 && (
            <div className="px-6 py-3 border-b border-gray-200">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search references…"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-psychr-midblue"
              />
            </div>
          )}

          {/* Reference list */}
          <div className="flex-1 overflow-y-auto">
            {citations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <span className="text-5xl mb-4">📚</span>
                <p className="text-gray-600 font-medium">No references yet</p>
                <p className="text-gray-400 text-sm mt-1">Paste a DOI above to add your first reference</p>
                <div className="mt-5 text-sm text-gray-500 space-y-1">
                  <p>✓ APA-7 auto-formatted</p>
                  <p>✓ Searchable library</p>
                  <p>✓ Copy individual citations</p>
                  <p>✓ Export full reference list</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map((cit) => (
                  <div key={cit.id} className="px-6 py-4 hover:bg-gray-50 group">
                    <p className="text-sm text-gray-800 leading-relaxed">{cit.apaString}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {cit.doi && (
                        <a
                          href={`https://doi.org/${cit.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-psychr-midblue hover:underline"
                        >
                          doi:{cit.doi}
                        </a>
                      )}
                      <span className="text-xs text-gray-400">
                        Added {new Date(cit.addedAt).toLocaleDateString()}
                      </span>
                      <div className="ml-auto flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(cit)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-0.5 rounded transition-colors"
                        >
                          {copied === cit.id ? '✓ Copied' : 'Copy APA'}
                        </button>
                        <button
                          onClick={() => removeCitation(cit.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      }
      rightWidth="300px"
      right={
        <div className="flex flex-col h-full">
          <PanelHeader title="Quick Stats" />
          <div className="p-4 space-y-4">
            <div className="bg-psychr-accent rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-psychr-blue">{citations.length}</p>
              <p className="text-sm text-gray-600 mt-1">References</p>
            </div>
            {citations.length > 0 && (
              <>
                <div className="space-y-1 text-xs text-gray-600">
                  <p className="font-medium text-gray-700">By year:</p>
                  {Object.entries(
                    citations.reduce((acc, c) => {
                      acc[c.year] = (acc[c.year] || 0) + 1
                      return acc
                    }, {} as Record<number, number>)
                  )
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .slice(0, 8)
                    .map(([year, count]) => (
                      <div key={year} className="flex justify-between">
                        <span>{year}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      }
    />
  )
}
