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
    const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: encode(JSON.stringify(data, null, 2)),
        sha,
      }),
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

  return { isConfigured, appendEntry }
}
