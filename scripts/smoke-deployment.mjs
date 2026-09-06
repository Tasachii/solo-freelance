// Read-only smoke; hashes are discovered from the actual document, never hard-coded.
const url = process.env.SOLO_SMOKE_URL
if (!url || !/^https?:\/\//.test(url)) throw new Error('Set SOLO_SMOKE_URL to the deployment URL')
const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
if (!response.ok) throw new Error(`Document: HTTP ${response.status}`)
const html = await response.text()
if (!html.includes('id="root"')) throw new Error('App root missing')
const assets = [...html.matchAll(/(?:src|href)="([^" ]+\.(?:js|css))"/g)]
  .map(match => new URL(match[1], url)).filter(asset => asset.origin === new URL(url).origin)
if (!assets.some(asset => asset.pathname.endsWith('.js'))) throw new Error('Built JavaScript asset missing')
for (const asset of assets) {
  const result = await fetch(asset, { signal: AbortSignal.timeout(30_000) })
  if (!result.ok) throw new Error(`${asset.pathname}: HTTP ${result.status}`)
  const type = result.headers.get('content-type') ?? ''
  if (type.includes('text/html')) throw new Error(`${asset.pathname}: HTML fallback instead of asset`)
}
console.log(`Deployment smoke passed: document + ${assets.length} assets`)
