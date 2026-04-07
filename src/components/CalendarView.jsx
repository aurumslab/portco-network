import { useState, useMemo } from 'react'

const STORAGE_KEY = 'outreach_calendar'

function getWeekKey(date) {
  // Returns ISO week start (Monday) as YYYY-MM-DD
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

function getWeekLabel(weekKey) {
  const monday = new Date(weekKey)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

function getWeeksAround(centerDate, count = 8) {
  const weeks = []
  const start = new Date(centerDate)
  start.setDate(start.getDate() - (count / 2) * 7)
  for (let i = 0; i < count; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i * 7)
    weeks.push(getWeekKey(d))
  }
  return weeks
}

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned', color: 'text-gray-400 border-gray-700 bg-gray-800/50' },
  { value: 'contacted', label: 'Contacted', color: 'text-blue-400 border-blue-800/60 bg-blue-950/30' },
  { value: 'replied', label: 'Replied', color: 'text-emerald-400 border-emerald-800/60 bg-emerald-950/30' },
  { value: 'meeting', label: 'Meeting Set', color: 'text-violet-400 border-violet-800/60 bg-violet-950/30' },
  { value: 'pass', label: 'Pass', color: 'text-gray-600 border-gray-800 bg-transparent' },
]

function statusStyle(value) {
  return STATUS_OPTIONS.find(s => s.value === value)?.color || STATUS_OPTIONS[0].color
}

function AddContactSheet({ contacts, onAdd, onClose }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return contacts.slice(0, 30)
    return contacts.filter(c =>
      c.contact_name?.toLowerCase().includes(q) ||
      c.x_handle?.toLowerCase().includes(q) ||
      c.role?.toLowerCase().includes(q) ||
      c.source_company?.toLowerCase().includes(q)
    ).slice(0, 30)
  }, [contacts, search])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Add to this week</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
        </div>
        <input
          autoFocus
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 mb-3"
        />
        <div className="overflow-y-auto flex-1 space-y-1">
          {filtered.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-4">No contacts found</p>
          )}
          {filtered.map(c => (
            <button
              key={c.x_handle || c.contact_name}
              onClick={() => { onAdd(c); onClose() }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{c.contact_name}</p>
                <p className="text-xs text-gray-500 truncate">{c.role} · {c.source_company}</p>
              </div>
              {c.sources?.length > 1 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 shrink-0">
                  ×{c.sources.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ContactItem({ item, onStatusChange, onRemove, onNoteChange }) {
  const [editingNote, setEditingNote] = useState(false)
  const [note, setNote] = useState(item.note || '')

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-800/60 last:border-0 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white">{item.contact_name}</span>
          {item.x_handle && (
            <a
              href={`https://x.com/${item.x_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              @{item.x_handle}
            </a>
          )}
          {item.sources?.length > 1 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
              ×{item.sources.length} founders
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{item.role} · {item.source_company}</p>
        {editingNote ? (
          <div className="mt-1.5 flex gap-2">
            <input
              autoFocus
              value={note}
              onChange={e => setNote(e.target.value)}
              onBlur={() => { setEditingNote(false); onNoteChange(note) }}
              onKeyDown={e => { if (e.key === 'Enter') { setEditingNote(false); onNoteChange(note) } }}
              placeholder="Add note..."
              className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-100 focus:outline-none focus:border-violet-500"
            />
          </div>
        ) : (
          <button
            onClick={() => setEditingNote(true)}
            className="mt-1 text-xs text-gray-700 hover:text-gray-400 transition-colors"
          >
            {note || '+ add note'}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <select
          value={item.status || 'planned'}
          onChange={e => onStatusChange(e.target.value)}
          className={`text-xs px-2 py-1 rounded-lg border bg-transparent focus:outline-none cursor-pointer ${statusStyle(item.status || 'planned')}`}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s.value} value={s.value} className="bg-gray-900 text-gray-200">{s.label}</option>
          ))}
        </select>
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all text-sm leading-none"
        >×</button>
      </div>
    </div>
  )
}

export default function CalendarView({ contacts }) {
  const today = new Date()
  const currentWeek = getWeekKey(today)
  const [selectedWeek, setSelectedWeek] = useState(currentWeek)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [calendar, setCalendar] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
    catch { return {} }
  })

  const weeks = useMemo(() => getWeeksAround(today, 12), [])

  const weekItems = calendar[selectedWeek] || []

  function save(newCal) {
    setCalendar(newCal)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCal))
  }

  function addContact(contact) {
    const existing = calendar[selectedWeek] || []
    const key = contact.x_handle || contact.contact_name
    if (existing.find(i => (i.x_handle || i.contact_name) === key)) return
    save({
      ...calendar,
      [selectedWeek]: [...existing, { ...contact, status: 'planned', note: '' }],
    })
  }

  function updateStatus(idx, status) {
    const items = [...(calendar[selectedWeek] || [])]
    items[idx] = { ...items[idx], status }
    save({ ...calendar, [selectedWeek]: items })
  }

  function updateNote(idx, note) {
    const items = [...(calendar[selectedWeek] || [])]
    items[idx] = { ...items[idx], note }
    save({ ...calendar, [selectedWeek]: items })
  }

  function removeContact(idx) {
    const items = (calendar[selectedWeek] || []).filter((_, i) => i !== idx)
    save({ ...calendar, [selectedWeek]: items })
  }

  const includedContacts = useMemo(() =>
    contacts.filter(c => c.include).sort((a, b) => (b.sources?.length || 1) - (a.sources?.length || 1)),
    [contacts]
  )

  return (
    <div className="max-w-2xl mx-auto">
      {/* Week selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {weeks.map(w => {
          const isToday = w === currentWeek
          const hasItems = (calendar[w] || []).length > 0
          return (
            <button
              key={w}
              onClick={() => setSelectedWeek(w)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                selectedWeek === w
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : isToday
                  ? 'border-violet-500/40 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20'
                  : 'border-gray-700 text-gray-500 bg-gray-900 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              {isToday && selectedWeek !== w ? '● ' : ''}{getWeekLabel(w)}
              {hasItems && selectedWeek !== w && <span className="ml-1 opacity-60">·{(calendar[w] || []).length}</span>}
            </button>
          )
        })}
      </div>

      {/* Week header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">
            {selectedWeek === currentWeek ? 'This Week' : getWeekLabel(selectedWeek)}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {weekItems.length === 0 ? 'No contacts scheduled' : `${weekItems.length} contact${weekItems.length !== 1 ? 's' : ''}`}
            {weekItems.length > 0 && ` · ${weekItems.filter(i => i.status === 'contacted' || i.status === 'replied' || i.status === 'meeting').length} reached out`}
          </p>
        </div>
        <button
          onClick={() => setShowAddSheet(true)}
          className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all"
        >
          + Add Contact
        </button>
      </div>

      {/* Contact list */}
      {weekItems.length === 0 ? (
        <div className="text-center py-16 text-gray-700">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">No contacts scheduled for this week</p>
          <p className="text-xs mt-1">Click "+ Add Contact" to add someone</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-1">
          {weekItems.map((item, idx) => (
            <ContactItem
              key={(item.x_handle || item.contact_name) + idx}
              item={item}
              onStatusChange={status => updateStatus(idx, status)}
              onNoteChange={note => updateNote(idx, note)}
              onRemove={() => removeContact(idx)}
            />
          ))}
        </div>
      )}

      {/* Status legend */}
      {weekItems.length > 0 && (
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {STATUS_OPTIONS.map(s => (
            <span key={s.value} className={`text-[10px] px-2 py-0.5 rounded-full border ${s.color}`}>
              {s.label}
            </span>
          ))}
        </div>
      )}

      {showAddSheet && (
        <AddContactSheet
          contacts={includedContacts}
          onAdd={addContact}
          onClose={() => setShowAddSheet(false)}
        />
      )}
    </div>
  )
}
