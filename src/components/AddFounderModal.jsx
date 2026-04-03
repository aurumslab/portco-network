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

export default function AddFounderModal({ onClose, onAdded, existingFounders = [] }) {
  const { appendEntry, isConfigured } = useGitHub()
  const [company, setCompany] = useState('')
  const [founder, setFounder] = useState('')
  const [handle, setHandle] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [duplicate, setDuplicate] = useState(null)

  const checkDuplicate = (companyVal, founderVal, handleVal) => {
    const cLower = companyVal.trim().toLowerCase()
    const fLower = founderVal.trim().toLowerCase()
    const hLower = handleVal.trim().replace(/^@/, '').toLowerCase()
    for (const f of existingFounders) {
      const companies = [f.company].flat().map(s => s.toLowerCase())
      const founders = [f.founder].flat().map(s => s.toLowerCase())
      const handles = [f.handle].flat().map(s => s.toLowerCase())
      if (
        (cLower && companies.some(c => c === cLower)) ||
        (fLower && founders.some(n => n === fLower)) ||
        (hLower && handles.some(h => h === hLower))
      ) {
        return f
      }
    }
    return null
  }

  const handleChange = (field, val) => {
    const vals = {
      company: field === 'company' ? val : company,
      founder: field === 'founder' ? val : founder,
      handle: field === 'handle' ? val : handle,
    }
    if (field === 'company') setCompany(val)
    if (field === 'founder') setFounder(val)
    if (field === 'handle') setHandle(val)
    setDuplicate(checkDuplicate(vals.company, vals.founder, vals.handle))
  }

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
      <Field label="Company" value={company} onChange={v => handleChange('company', v)} placeholder="e.g. Monad" required />
      <Field label="Founder 名字" value={founder} onChange={v => handleChange('founder', v)} placeholder="e.g. Keone Hon" required />
      <Field label="X Handle（不含 @）" value={handle} onChange={v => handleChange('handle', v)} placeholder="e.g. keoneHD" />

      {duplicate && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 mb-1">
          <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>已經有這個 Founder 了：<strong>{[duplicate.founder].flat().join(' & ')}</strong>（{duplicate.company}）</span>
        </div>
      )}
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
