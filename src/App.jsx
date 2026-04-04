import { useState, useMemo, useEffect, useRef } from 'react'
import SettingsModal from './components/SettingsModal.jsx'
import AddFounderModal from './components/AddFounderModal.jsx'
import AddContactModal from './components/AddContactModal.jsx'
import UploadFollowingModal from './components/UploadFollowingModal.jsx'
import { useGitHub } from './hooks/useGitHub.js'

const STORAGE_KEY = 'contact_pool_overrides'

// ── Icons ──────────────────────────────────────────────────────────────────
function XLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function EmptyIcon() {
  return (
    <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────
function founderDisplayName(f) {
  return Array.isArray(f.founder) ? f.founder.join(' & ') : f.founder
}

// ── Sub-components ─────────────────────────────────────────────────────────
function IncludeBadge({ include }) {
  return include ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      Include
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700/40 text-gray-500 border border-gray-700/60 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
      Exclude
    </span>
  )
}

function ContactCard({ contact, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  const longNote = contact.notes && contact.notes.length > 110

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 transition-all duration-200 ${
        contact.include
          ? 'bg-gray-900 border-gray-800 hover:border-gray-700'
          : 'bg-[#0d0d12] border-gray-800/40 opacity-60 hover:opacity-80'
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm leading-tight">{contact.contact_name}</span>
            <IncludeBadge include={contact.include} />
          </div>
          <p className="text-xs text-violet-400 mt-0.5 font-medium">{contact.role}</p>
          <p className="text-xs text-gray-400 mt-0.5">{contact.project}</p>
        </div>

        <button
          onClick={() => onToggle(contact)}
          className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium border transition-all duration-150 ${
            contact.include
              ? 'bg-transparent text-gray-400 border-gray-700 hover:bg-red-950/40 hover:text-red-400 hover:border-red-800'
              : 'bg-transparent text-gray-500 border-gray-700 hover:bg-emerald-950/40 hover:text-emerald-400 hover:border-emerald-800'
          }`}
        >
          {contact.include ? 'Exclude' : 'Include'}
        </button>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-600">
          via <span className="text-gray-400">{contact.source_founder}</span>
          <span className="text-gray-600"> · {contact.source_company}</span>
        </span>

        {contact.x_handle ? (
          <a
            href={contact.x_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            <XLogo />
            @{contact.x_handle}
          </a>
        ) : (
          <span className="text-xs text-gray-700 italic">no handle</span>
        )}
      </div>

      {/* Notes */}
      {contact.notes && (
        <div>
          <p className={`text-xs text-gray-500 leading-relaxed ${!expanded && longNote ? 'line-clamp-2' : ''}`}>
            {contact.notes}
          </p>
          {longNote && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-gray-700 hover:text-gray-400 mt-0.5 transition-colors"
            >
              {expanded ? 'show less' : 'show more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function FounderRow({ founder, counts, selected, onClick }) {
  const active = selected
  const name = founderDisplayName(founder)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
        active
          ? 'bg-violet-600/15 text-violet-300 border border-violet-500/25'
          : 'text-gray-400 hover:bg-gray-800/70 hover:text-gray-200 border border-transparent'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-xs leading-tight">{founder.company}</p>
          <p className="truncate text-[11px] text-gray-600 mt-0.5">{name}</p>
        </div>
        {counts.total > 0 && (
          <span
            className={`text-xs shrink-0 px-1.5 py-0.5 rounded font-mono ${
              active ? 'bg-violet-500/25 text-violet-300' : 'bg-gray-800 text-gray-500'
            }`}
          >
            {counts.included}/{counts.total}
          </span>
        )}
      </div>
    </button>
  )
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const { pollWorkflow, getFileContent } = useGitHub()
  const [foundersRaw, setFoundersRaw] = useState([])
  const [contactsRaw, setContactsRaw] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    Promise.all([
      fetch(`${base}data/founders.json`).then(r => r.json()),
      fetch(`${base}data/contacts.json`).then(r => r.json()),
    ]).then(([founders, contacts]) => {
      setFoundersRaw(founders)
      setContactsRaw(contacts)
      setLoading(false)
    })
  }, [])

  const [overrides, setOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
    catch { return {} }
  })
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all | included | excluded
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [activeModal, setActiveModal] = useState(null) // 'settings' | 'addFounder' | 'addContact' | 'upload'
  const [mainView, setMainView] = useState('contacts') // 'contacts' | 'founders'
  const [workflowStatus, setWorkflowStatus] = useState(null) // null | 'queued' | 'in_progress' | 'completed'
  const [workflowResult, setWorkflowResult] = useState(null) // null | 'success' | 'failure' | 'timeout'
  const pollAbortRef = useRef(null)

  // Merge overrides into contacts
  const contacts = useMemo(
    () => contactsRaw.map(c => ({
      ...c,
      include: overrides[c.x_handle || c.contact_name] !== undefined
        ? overrides[c.x_handle || c.contact_name]
        : c.include,
    })),
    [overrides, contactsRaw],
  )

  // Filtered contacts for main view
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return contacts.filter(c => {
      if (selectedCompany && c.source_company !== selectedCompany) return false
      if (filterStatus === 'included' && !c.include) return false
      if (filterStatus === 'excluded' && c.include) return false
      if (!q) return true
      return (
        c.contact_name?.toLowerCase().includes(q) ||
        c.project?.toLowerCase().includes(q) ||
        c.role?.toLowerCase().includes(q) ||
        c.source_founder?.toLowerCase().includes(q) ||
        c.source_company?.toLowerCase().includes(q) ||
        c.x_handle?.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q)
      )
    })
  }, [contacts, search, filterStatus, selectedCompany])

  // Per-company counts for sidebar
  const countsByCompany = useMemo(() => {
    const map = {}
    contacts.forEach(c => {
      if (!map[c.source_company]) map[c.source_company] = { total: 0, included: 0 }
      map[c.source_company].total++
      if (c.include) map[c.source_company].included++
    })
    return map
  }, [contacts])

  const globalStats = useMemo(() => ({
    total: contacts.length,
    included: contacts.filter(c => c.include).length,
  }), [contacts])

  const handleToggle = (contact) => {
    const key = contact.x_handle || contact.contact_name
    const current = overrides[key] !== undefined ? overrides[key] : contact.include
    const next = { ...overrides, [key]: !current }
    setOverrides(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const filterTabs = [
    { value: 'all', label: 'All' },
    { value: 'included', label: 'Included' },
    { value: 'excluded', label: 'Excluded' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-600 text-sm gap-3">
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading contact pool…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-5 h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">Portfolio Contact Pool</h1>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-none">Second-degree warm intro network</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-emerald-400">{globalStats.included}</span>
                <span>included</span>
              </div>
              <span className="text-gray-700">·</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-300">{globalStats.total}</span>
                <span>contacts</span>
              </div>
              <span className="text-gray-700">·</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-300">{foundersRaw.length}</span>
                <span>founders</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 ml-2">
              <button
                data-upload
                onClick={() => setActiveModal('upload')}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-all font-medium"
              >
                ↑ Upload List
              </button>
              <button
                onClick={() => setActiveModal('addFounder')}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-all font-medium"
              >
                + Founder
              </button>
              <button
                onClick={() => setActiveModal('addContact')}
                className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-all font-medium"
              >
                + Contact
              </button>
              <button
                onClick={() => setActiveModal('settings')}
                title="GitHub 設定"
                className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Workflow status banner ── */}
      {workflowStatus && (
        <div className={`w-full px-5 py-2.5 text-xs flex items-center justify-between gap-3 ${
          workflowResult === 'success' ? 'bg-emerald-950/60 border-b border-emerald-800/40 text-emerald-400' :
          workflowResult === 'failure' ? 'bg-red-950/60 border-b border-red-800/40 text-red-400' :
          'bg-violet-950/60 border-b border-violet-800/40 text-violet-400'
        }`}>
          <div className="flex items-center gap-2">
            {workflowStatus !== 'completed' && (
              <svg className="w-3.5 h-3.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {workflowResult === 'success' && <span>✓</span>}
            {workflowResult === 'failure' && <span>✕</span>}
            <span>
              {workflowResult === 'success' && '篩選完成，聯絡人名單已更新！'}
              {workflowResult === 'failure' && '篩選失敗，請到 GitHub Actions 查看錯誤'}
              {workflowResult === 'timeout' && '等待逾時，請稍後手動重新整理'}
              {!workflowResult && workflowStatus === 'queued' && '等待 GitHub Actions 啟動...'}
              {!workflowResult && workflowStatus === 'in_progress' && '正在篩選 following list...'}
            </span>
          </div>
          <button
            onClick={() => { setWorkflowStatus(null); setWorkflowResult(null) }}
            className="opacity-60 hover:opacity-100 transition-opacity"
          >✕</button>
        </div>
      )}

      <div className="flex flex-1 max-w-screen-xl mx-auto w-full px-5 py-6 gap-6 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-52 shrink-0 hidden md:flex flex-col" style={{height: 'calc(100vh - 56px)', position: 'sticky', top: '56px'}}>
          <div className="overflow-y-auto flex-1 space-y-1 pr-1">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-2">
              Portfolio
            </p>

            {/* Per founder */}
            {foundersRaw.map(f => (
              <FounderRow
                key={f.company}
                founder={f}
                counts={countsByCompany[f.company] || { total: 0, included: 0 }}
                selected={selectedCompany === f.company}
                onClick={() => setSelectedCompany(selectedCompany === f.company ? null : f.company)}
              />
            ))}
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 min-w-0 overflow-y-auto" style={{height: 'calc(100vh - 56px)'}}>


          {/* View tabs */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs">
              {[{ value: 'contacts', label: 'Contacts' }, { value: 'founders', label: 'Founders' }].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setMainView(value)}
                  className={`px-4 py-2 font-medium transition-colors ${
                    mainView === value
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mainView === 'founders' ? (
            /* ── Founders view ── */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {foundersRaw.map(f => {
                const handles = Array.isArray(f.handle) ? f.handle : [f.handle]
                const names = Array.isArray(f.founder) ? f.founder : [f.founder]
                return (
                  <div key={f.company} className="rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-gray-700 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white text-sm">{f.company}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{names.join(' & ')}</p>
                        {f.notes ? <p className="text-xs text-gray-600 mt-1">{f.notes}</p> : null}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {handles.filter(h => h).map((h, i) => (
                          <a
                            key={h}
                            href={`https://x.com/${h}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                          >
                            <XLogo />
                            @{h}
                          </a>
                        ))}
                        {handles.filter(h => h).length === 0 && (
                          <span className="text-xs text-gray-700 italic">no handle</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* ── Contacts view ── */
            <>
              {/* Filter bar */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-52">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    placeholder="Search name, project, role, notes…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <div className="flex rounded-lg border border-gray-700 overflow-hidden text-xs">
                  {filterTabs.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setFilterStatus(value)}
                      className={`px-3.5 py-2 font-medium transition-colors ${
                        filterStatus === value
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-600 mb-4">
                {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
                {selectedCompany && <span className="text-gray-500"> · {selectedCompany}</span>}
                {search && <span className="text-gray-500"> · "{search}"</span>}
              </p>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-700 gap-3">
                  <EmptyIcon />
                  <p className="text-sm">No contacts match your filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {filtered.map((contact, i) => (
                    <ContactCard
                      key={(contact.x_handle || contact.contact_name) + i}
                      contact={contact}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Modals ── */}
      {activeModal === 'settings' && (
        <SettingsModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'addFounder' && (
        <AddFounderModal
          onClose={() => setActiveModal(null)}
          onAdded={updated => setFoundersRaw(updated)}
          existingFounders={foundersRaw}
        />
      )}
      {activeModal === 'addContact' && (
        <AddContactModal
          founders={foundersRaw}
          onClose={() => setActiveModal(null)}
          onAdded={updated => setContactsRaw(updated)}
        />
      )}
      {activeModal === 'upload' && (
        <UploadFollowingModal
          onClose={() => setActiveModal(null)}
          onUploaded={(startedAt) => {
            setActiveModal(null)
            setWorkflowStatus('queued')
            setWorkflowResult(null)
            if (pollAbortRef.current) pollAbortRef.current.abort()
            const controller = new AbortController()
            pollAbortRef.current = controller
            pollWorkflow('Filter Following List', startedAt, (status) => {
              setWorkflowStatus(status)
            }, controller.signal).then(result => {
              setWorkflowResult(result)
              setWorkflowStatus('completed')
              if (result === 'success') {
                getFileContent('public/data/contacts.json').then(setContactsRaw).catch(() => {
                  // fallback to Pages URL if GitHub API fails
                  const base = import.meta.env.BASE_URL
                  fetch(`${base}data/contacts.json?t=${Date.now()}`).then(r => r.json()).then(setContactsRaw)
                })
              }
            })
          }}
        />
      )}
    </div>
  )
}
