import { useState } from 'react'
import Modal from './Modal.jsx'
import { useGitHub } from '../hooks/useGitHub.js'

function Field({ label, value, onChange, placeholder, required }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-gray-400 mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
      />
    </div>
  )
}

export default function AddContactModal({ founders, onClose, onAdded }) {
  const { appendEntry, isConfigured } = useGitHub()

  const [sourceCompany, setSourceCompany] = useState('')
  const [contactName, setContactName] = useState('')
  const [xHandle, setXHandle] = useState('')
  const [role, setRole] = useState('')
  const [project, setProject] = useState('')
  const [notes, setNotes] = useState('')
  const [include, setInclude] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedFounder = founders.find(f => f.company === sourceCompany)
  const sourceFounderName = selectedFounder
    ? (Array.isArray(selectedFounder.founder)
        ? selectedFounder.founder.join(' & ')
        : selectedFounder.founder)
    : ''

  const handleSave = async () => {
    if (!sourceCompany || !contactName.trim()) {
      setError('Source Company 和聯絡人名字為必填')
      return
    }
    if (!isConfigured()) {
      setError('請先點右上角齒輪，填入 GitHub 設定')
      return
    }
    setLoading(true)
    setError('')
    try {
      const handle = xHandle.trim().replace(/^@/, '')
      const newEntry = {
        source_founder: sourceFounderName,
        source_company: sourceCompany,
        contact_name: contactName.trim(),
        x_handle: handle,
        x_url: handle ? `https://x.com/${handle}` : '',
        role: role.trim(),
        project: project.trim(),
        notes: notes.trim(),
        include,
        status: include ? 'Active' : 'Excluded',
      }
      const updated = await appendEntry(
        'public/data/contacts.json',
        newEntry,
        `Add contact: ${contactName.trim()}`,
      )
      onAdded(updated)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="新增 Contact" onClose={onClose}>
      {/* Source Company dropdown */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">
          Source Company <span className="text-red-400">*</span>
        </label>
        <select
          value={sourceCompany}
          onChange={e => setSourceCompany(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-violet-500 transition-colors"
        >
          <option value="">選擇 Portfolio Company</option>
          {founders.map(f => (
            <option key={f.company} value={f.company}>{f.company}</option>
          ))}
        </select>
      </div>

      {sourceFounderName && (
        <p className="text-xs text-gray-600 -mt-2 mb-3 px-1">
          Founder: <span className="text-gray-400">{sourceFounderName}</span>
        </p>
      )}

      <Field label="聯絡人名字" value={contactName} onChange={setContactName} placeholder="e.g. Vitalik Buterin" required />
      <Field label="X Handle（不含 @）" value={xHandle} onChange={setXHandle} placeholder="e.g. VitalikButerin" />
      <Field label="Role" value={role} onChange={setRole} placeholder="e.g. Co-Founder / CEO" />
      <Field label="Project" value={project} onChange={setProject} placeholder="e.g. Ethereum Foundation" />
      <Field label="備註" value={notes} onChange={setNotes} placeholder="選填" />

      {/* Include toggle */}
      <div className="flex items-center gap-3 mb-2">
        <label className="text-xs text-gray-400">Include</label>
        <button
          type="button"
          onClick={() => setInclude(v => !v)}
          className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${include ? 'bg-emerald-500' : 'bg-gray-700'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${include ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
        <span className="text-xs text-gray-500">{include ? 'Include' : 'Exclude'}</span>
      </div>

      {error && <p className="text-xs text-red-400 mb-3 mt-2">{error}</p>}

      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 text-xs rounded-lg font-medium bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-50"
        >
          {loading ? '新增中…' : '新增 Contact'}
        </button>
      </div>
    </Modal>
  )
}
