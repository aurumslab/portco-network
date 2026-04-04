const BASE = 'https://api.github.com'

function encode(str) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)))
}

function decode(b64) {
  const clean = b64.replace(/\n/g, '')
  return new TextDecoder().decode(Uint8Array.from(atob(clean), c => c.charCodeAt(0)))
}

export function useGitHub() {
  function getConfig() {
    return {
      token: localStorage.getItem('gh_token') || '',
      owner: localStorage.getItem('gh_owner') || '',
      repo: localStorage.getItem('gh_repo') || '',
    }
  }

  function isConfigured() {
    const { token, owner, repo } = getConfig()
    return !!(token && owner && repo)
  }

  async function getFile(path) {
    const { token, owner, repo } = getConfig()
    const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    })
    if (!res.ok) throw new Error(`GitHub API ${res.status}: 請確認 Token 和 Repo 設定正確`)
    return res.json()
  }

  async function putFile(path, data, sha, message) {
    const { token, owner, repo } = getConfig()
    const body = { message, content: encode(JSON.stringify(data, null, 2)) }
    if (sha) body.sha = sha
    const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `GitHub API ${res.status}`)
    }
    return res.json()
  }

  async function uploadRawFile(path, content, message) {
    const { token, owner, repo } = getConfig()
    const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, content: encode(content) }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `GitHub API ${res.status}`)
    }
    return res.json()
  }

  async function appendEntry(path, newEntry, message) {
    const file = await getFile(path)
    const current = JSON.parse(decode(file.content))
    const updated = [...current, newEntry]
    await putFile(path, updated, file.sha, message)
    return updated
  }

  async function pollWorkflow(workflowName, startedAfter, onStatus, signal) {
    const { token, owner, repo } = getConfig()
    const maxWait = 5 * 60 * 1000 // 5 min timeout
    const interval = 8000
    const started = Date.now()

    while (Date.now() - started < maxWait) {
      if (signal?.aborted) return 'cancelled'
      await new Promise(r => setTimeout(r, interval))
      if (signal?.aborted) return 'cancelled'

      const res = await fetch(
        `${BASE}/repos/${owner}/${repo}/actions/runs?per_page=5`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
      )
      if (!res.ok) continue
      const data = await res.json()
      const run = data.workflow_runs?.find(r =>
        r.name === workflowName &&
        new Date(r.created_at).getTime() >= startedAfter
      )
      if (!run) continue

      onStatus(run.status, run.conclusion)
      if (run.status === 'completed') {
        return run.conclusion // 'success' | 'failure'
      }
    }
    return 'timeout'
  }

  return { isConfigured, appendEntry, uploadRawFile, pollWorkflow }
}
