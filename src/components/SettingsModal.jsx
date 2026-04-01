import { useState } from 'react'
import Modal from './Modal.jsx'

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
      />
    </div>
  )
}

export default function SettingsModal({ onClose }) {
  const [token, setToken] = useState(localStorage.getItem('gh_token') || '')
  const [owner, setOwner] = useState(localStorage.getItem('gh_owner') || '')
  const [repo, setRepo] = useState(localStorage.getItem('gh_repo') || '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem('gh_token', token.trim())
    localStorage.setItem('gh_owner', owner.trim())
    localStorage.setItem('gh_repo', repo.trim())
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 600)
  }

  const isComplete = token.trim() && owner.trim() && repo.trim()

  return (
    <Modal title="GitHub 設定" onClose={onClose}>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        設定後可直接從 UI 新增資料並自動 commit 到 GitHub。
        Token 需要{' '}
        <span className="text-violet-400 font-mono">public_repo</span> 權限。
      </p>

      <Field
        label="Personal Access Token"
        value={token}
        onChange={setToken}
        type="password"
        placeholder="ghp_xxxxxxxxxxxx"
      />
      <Field
        label="GitHub Username"
        value={owner}
        onChange={setOwner}
        placeholder="your-username"
      />
      <Field
        label="Repository Name"
        value={repo}
        onChange={setRepo}
        placeholder="contact-pool"
      />

      <p className="text-xs text-gray-700 mt-1 mb-4">
        Token 儲存在瀏覽器 localStorage，不會上傳到任何伺服器。
      </p>

      <div className="flex justify-between items-center mt-2">
        <a
          href="https://github.com/settings/tokens/new?scopes=public_repo&description=contact-pool"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sky-400 hover:underline"
        >
          建立 GitHub Token →
        </a>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!isComplete}
            className={`px-4 py-2 text-xs rounded-lg font-medium transition-all disabled:opacity-40 ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-violet-600 hover:bg-violet-500 text-white'
            }`}
          >
            {saved ? '已儲存 ✓' : '儲存'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
