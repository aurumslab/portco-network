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

export default function AddFounderModal({ onClose, onAdded }) {
  const { appendEntry, isConfigured } = useGitHub()
  const [company, setCompany] = useState('')
  const [founder, setFounder] = useState('')
  const [handle, setHandle] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!company.trim() || !founder.trim()) {
      setError('Company 和 Founder 名字為必填')
      return
    }
    if (!isConfigured()) {
      setError('請先點右上角齒輪，填入 GitHub 設定')
      return
    }
    setLoading(true)
    setError('')
    try {
      const newEntry = {
        company: company.trim(),
        founder: founder.trim(),
        handle: handle.trim().replace(/^@/, ''),
        notes: notes.trim(),
      }
      const updated = await appendEntry(
        'public/data/founders.json',
        newEntry,
        `Add founder: ${company.trim()}`,
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
    <Modal title="新增 Portfolio Founder" onClose={onClose}>
      <Field label="Company" value={company} onChange={setCompany} placeholder="e.g. Monad" required />
      <Field label="Founder 名字" value={founder} onChange={setFounder} placeholder="e.g. Keone Hon" required />
      <Field label="X Handle（不含 @）" value={handle} onChange={setHandle} placeholder="e.g. keoneHD" />
      <Field label="備註" value={notes} onChange={setNotes} placeholder="選填" />

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

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
          {loading ? '新增中…' : '新增 Founder'}
        </button>
      </div>
    </Modal>
  )
}
