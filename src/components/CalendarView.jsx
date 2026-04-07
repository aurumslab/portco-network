import { useState, useMemo } from 'react'

const STORAGE_KEY = 'outreach_calendar'

// Each entry keyed by YYYY-MM-DD (the specific day)
const STATUS_OPTIONS = [
  { value: 'planned',   label: 'Planned',     dot: 'bg-gray-500' },
  { value: 'contacted', label: 'Contacted',   dot: 'bg-blue-400' },
  { value: 'replied',   label: 'Replied',     dot: 'bg-emerald-400' },
  { value: 'meeting',   label: 'Meeting Set', dot: 'bg-violet-400' },
  { value: 'pass',      label: 'Pass',        dot: 'bg-gray-700' },
]

const STATUS_STYLE = {
  planned:   'text-gray-400 border-gray-700 bg-gray-800/50',
  contacted: 'text-blue-400 border-blue-800/60 bg-blue-950/30',
  replied:   'text-emerald-400 border-emerald-800/60 bg-emerald-950/30',
  meeting:   'text-violet-400 border-violet-800/60 bg-violet-950/30',
  pass:      'text-gray-600 border-gray-800 bg-transparent',
}

const DOT_COLOR = {
  planned: 'bg-gray-500',
  contacted: 'bg-blue-400',
  replied: 'bg-emerald-400',
  meeting: 'bg-violet-400',
  pass: 'bg-gray-700',
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  // 0=Sun, adjust to Mon=0
  const day = new Date(year, month, 1).getDay()
  return (day + 6) % 7
}

// ── Add contact sheet ─────────────────────────────────────────────────────────
function AddContactSheet({ contacts, dateKey, onAdd, onClose }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return contacts.slice(0, 40)
    return contacts.filter(c =>
      c.contact_name?.toLowerCase().includes(q) ||
      c.x_handle?.toLowerCase().includes(q) ||
      c.role?.toLowerCase().includes(q) ||
      c.source_company?.toLowerCase().includes(q)
    ).slice(0, 40)
  }, [contacts, search])

  const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-white">Add contact</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
        </div>
        <p className="text-xs text-gray-500 mb-3">{fmt(dateKey)}</p>
        <input
          autoFocus
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 mb-3"
        />
        <div className="overflow-y-auto flex-1 space-y-0.5">
          {filtered.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No contacts found</p>}
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
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 shrink-0">×{c.sources.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Day detail panel ──────────────────────────────────────────────────────────
function DayPanel({ dateKey, items, onStatusChange, onNoteChange, onRemove, onAddClick, onClose }) {
  const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const [editingNoteIdx, setEditingNoteIdx] = useState(null)
  const [noteVal, setNoteVal] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-lg bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">{fmt(dateKey)}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{items.length} contact{items.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onAddClick} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all">+ Add</button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-700">
            <p className="text-sm">No contacts for this day</p>
            <p className="text-xs mt-1">Click "+ Add" to schedule someone</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-0">
            {items.map((item, idx) => (
              <div key={(item.x_handle || item.contact_name) + idx} className="flex items-start gap-3 py-3 border-b border-gray-800/60 last:border-0 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{item.contact_name}</span>
                    {item.x_handle && (
                      <a href={`https://x.com/${item.x_handle}`} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:text-sky-300">@{item.x_handle}</a>
                    )}
                    {item.sources?.length > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">×{item.sources.length} founders</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{item.role} · {item.source_company}</p>
                  {editingNoteIdx === idx ? (
                    <input
                      autoFocus
                      value={noteVal}
                      onChange={e => setNoteVal(e.target.value)}
                      onBlur={() => { setEditingNoteIdx(null); onNoteChange(idx, noteVal) }}
                      onKeyDown={e => { if (e.key === 'Enter') { setEditingNoteIdx(null); onNoteChange(idx, noteVal) } }}
                      placeholder="Add note..."
                      className="mt-1.5 w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                    />
                  ) : (
                    <button onClick={() => { setEditingNoteIdx(idx); setNoteVal(item.note || '') }} className="mt-1 text-xs text-gray-700 hover:text-gray-400 transition-colors">
                      {item.note || '+ add note'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={item.status || 'planned'}
                    onChange={e => onStatusChange(idx, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-lg border bg-transparent focus:outline-none cursor-pointer ${STATUS_STYLE[item.status || 'planned']}`}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value} className="bg-gray-900 text-gray-200">{s.label}</option>)}
                  </select>
                  <button onClick={() => onRemove(idx)} className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all text-sm">×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main calendar ─────────────────────────────────────────────────────────────
export default function CalendarView({ contacts }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(null) // YYYY-MM-DD
  const [addingToDate, setAddingToDate] = useState(null)
  const [calendar, setCalendar] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
    catch { return {} }
  })

  const todayKey = toDateKey(today)

  const includedContacts = useMemo(() =>
    contacts.filter(c => c.include).sort((a, b) => (b.sources?.length || 1) - (a.sources?.length || 1)),
    [contacts]
  )

  function save(newCal) {
    setCalendar(newCal)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCal))
  }

  function addContact(dateKey, contact) {
    const existing = calendar[dateKey] || []
    const key = contact.x_handle || contact.contact_name
    if (existing.find(i => (i.x_handle || i.contact_name) === key)) return
    save({ ...calendar, [dateKey]: [...existing, { ...contact, status: 'planned', note: '' }] })
  }

  function updateStatus(dateKey, idx, status) {
    const items = [...(calendar[dateKey] || [])]
    items[idx] = { ...items[idx], status }
    save({ ...calendar, [dateKey]: items })
  }

  function updateNote(dateKey, idx, note) {
    const items = [...(calendar[dateKey] || [])]
    items[idx] = { ...items[idx], note }
    save({ ...calendar, [dateKey]: items })
  }

  function removeContact(dateKey, idx) {
    const items = (calendar[dateKey] || []).filter((_, i) => i !== idx)
    save({ ...calendar, [dateKey]: items })
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth) // 0=Mon

  const days = []
  // Leading empty cells
  for (let i = 0; i < firstDow; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ day: d, key })
  }

  const selectedItems = selectedDate ? (calendar[selectedDate] || []) : []

  return (
    <div className="max-w-3xl mx-auto">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-white">{monthName}</h2>
          {(viewYear !== today.getFullYear() || viewMonth !== today.getMonth()) && (
            <button onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Today
            </button>
          )}
        </div>
        <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-600 uppercase tracking-widest py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />
          const { day, key } = cell
          const items = calendar[key] || []
          const isToday = key === todayKey
          const isSelected = key === selectedDate

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(isSelected ? null : key)}
              className={`relative min-h-16 rounded-lg border p-1.5 text-left transition-all ${
                isSelected
                  ? 'border-violet-500 bg-violet-950/40'
                  : isToday
                  ? 'border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10'
                  : 'border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-900'
              }`}
            >
              <span className={`text-xs font-medium ${isToday ? 'text-violet-400' : 'text-gray-400'}`}>{day}</span>
              {items.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLOR[item.status || 'planned']}`} />
                      <span className="text-[10px] text-gray-400 truncate leading-tight">{item.contact_name?.split(' ')[0]}</span>
                    </div>
                  ))}
                  {items.length > 3 && <p className="text-[10px] text-gray-600">+{items.length - 3} more</p>}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        {STATUS_OPTIONS.map(s => (
          <div key={s.value} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            <span className="text-[10px] text-gray-600">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Day detail panel */}
      {selectedDate && !addingToDate && (
        <DayPanel
          dateKey={selectedDate}
          items={selectedItems}
          onStatusChange={(idx, status) => updateStatus(selectedDate, idx, status)}
          onNoteChange={(idx, note) => updateNote(selectedDate, idx, note)}
          onRemove={idx => removeContact(selectedDate, idx)}
          onAddClick={() => setAddingToDate(selectedDate)}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {/* Add contact sheet */}
      {addingToDate && (
        <AddContactSheet
          contacts={includedContacts}
          dateKey={addingToDate}
          onAdd={contact => addContact(addingToDate, contact)}
          onClose={() => { setAddingToDate(null) }}
        />
      )}
    </div>
  )
}
