import { useState, useRef } from 'react'
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

export default function UploadFollowingModal({ onClose }) {
  const { uploadRawFile, isConfigured } = useGitHub()
  const [founder, setFounder] = useState('')
  const [company, setCompany] = useState('')
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const fileRef = useRef()

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (!f.name.endsWith('.json')) {
      setFileError('請上傳 .json 檔案')
      setFile(null)
      return
    }
    setFileError('')
    setFile(f)
  }

  const handleUpload = async () => {
    if (!founder.trim() || !company.trim()) {
      setError('Founder 名字和 Company 為必填')
      return
    }
    if (!file) {
      setError('請選擇 JSON 檔案')
      return
    }
    if (!isConfigured()) {
      setError('請先點右上角齒輪，填入 GitHub 設定')
      return
    }

    setLoading(true)
    setError('')

    try {
      const raw = await file.text()
      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch {
        throw new Error('JSON 格式錯誤，請確認檔案內容')
      }

      // Wrap with metadata
      const wrapped = {
        source_founder: founder.trim(),
        source_company: company.trim(),
        following: Array.isArray(parsed) ? parsed : (parsed.following || []),
      }

      const slug = founder.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const ts = Date.now()
      const path = `raw/following-${slug}-${ts}.json`

      await uploadRawFile(
        path,
        JSON.stringify(wrapped, null, 2),
        `Upload following list: ${founder.trim()} (${company.trim()})`,
      )
      setDone(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <Modal title="上傳成功" onClose={onClose}>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-300 mb-1">Following list 已上傳！</p>
          <p className="text-xs text-gray-500 mb-4">
            GitHub Actions 正在自動篩選，完成後會自動更新聯絡人名單。<br />
            通常需要 1–2 分鐘。
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs rounded-lg font-medium bg-violet-600 hover:bg-violet-500 text-white transition-all"
          >
            關閉
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="上傳 Following List" onClose={onClose}>
      <p className="text-xs text-gray-500 mb-4">
        上傳後 GitHub Actions 會自動篩選並加入聯絡人名單（約 1–2 分鐘）。
      </p>

      <Field label="Source Founder 名字" value={founder} onChange={setFounder} placeholder="e.g. Keone Hon" required />
      <Field label="Source Company" value={company} onChange={setCompany} placeholder="e.g. Monad" required />

      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">
          Following List JSON 檔案<span className="text-red-400 ml-0.5">*</span>
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="w-full px-3 py-3 bg-gray-800 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 cursor-pointer hover:border-violet-500 hover:text-gray-300 transition-colors text-center"
        >
          {file ? (
            <span className="text-gray-200">{file.name} <span className="text-gray-500 text-xs">({(file.size / 1024).toFixed(0)} KB)</span></span>
          ) : (
            '點擊選擇 .json 檔案'
          )}
        </div>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
        {fileError && <p className="text-xs text-red-400 mt-1">{fileError}</p>}
      </div>

      <p className="text-xs text-gray-600 mb-4">
        支援 fetch-following.js 的輸出格式（array of &#123;handle, name, followers, bio&#125;）
      </p>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleUpload}
          disabled={loading}
          className="px-4 py-2 text-xs rounded-lg font-medium bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-50"
        >
          {loading ? '上傳中…' : '上傳並篩選'}
        </button>
      </div>
    </Modal>
  )
}
