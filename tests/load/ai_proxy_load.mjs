#!/usr/bin/env node
/**
 * Concurrent POST /api/ai/chat load smoke test.
 * Usage: node tests/load/ai_proxy_load.mjs --help
 */

function parseArgs(argv) {
  const out = {
    base: 'http://127.0.0.1:8080',
    token: process.env.TOKEN ?? '',
    concurrency: 10,
    total: 50,
    timeoutMs: 60_000,
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { help: true }
    if (a === '--base') out.base = argv[++i] ?? out.base
    else if (a === '--token') out.token = argv[++i] ?? ''
    else if (a === '--concurrency') out.concurrency = Number(argv[++i]) || out.concurrency
    else if (a === '--total') out.total = Number(argv[++i]) || out.total
    else if (a === '--timeout') out.timeoutMs = Number(argv[++i]) || out.timeoutMs
  }
  return out
}

function printHelp() {
  console.log(`Usage: node tests/load/ai_proxy_load.mjs [options]

Options:
  --base URL        API base (default: http://127.0.0.1:8080)
  --token STR       Bearer JWT (or set TOKEN env)
  --concurrency N   Parallel in-flight requests (default: 10)
  --total N         Total requests to send (default: 50)
  --timeout MS      Per-request timeout (default: 60000)
  -h, --help        Show this help
`)
}

async function main() {
  const opts = parseArgs(process.argv)
  if (opts.help) {
    printHelp()
    process.exit(0)
  }
  if (!opts.token) {
    console.error('Missing JWT: pass --token or set TOKEN env')
    printHelp()
    process.exit(1)
  }

  const url = `${opts.base.replace(/\/$/, '')}/api/ai/chat`
  const body = JSON.stringify({
    tool: 'default',
    messages: [{ role: 'user', content: 'load test ping' }],
    context: {},
  })

  const latencies = []
  const byStatus = new Map()

  let next = 0
  const lock = { n: 0 }

  async function worker() {
    while (true) {
      const i = lock.n++
      if (i >= opts.total) break
      const t0 = performance.now()
      try {
        const ac = new AbortController()
        const tid = setTimeout(() => ac.abort(), opts.timeoutMs)
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${opts.token}`,
          },
          body,
          signal: ac.signal,
        })
        clearTimeout(tid)
        const ms = performance.now() - t0
        latencies.push(ms)
        const k = String(res.status)
        byStatus.set(k, (byStatus.get(k) ?? 0) + 1)
      } catch (e) {
        const ms = performance.now() - t0
        latencies.push(ms)
        const k = e.name === 'AbortError' ? 'timeout' : 'error'
        byStatus.set(k, (byStatus.get(k) ?? 0) + 1)
      }
    }
  }

  const workers = Array.from({ length: opts.concurrency }, () => worker())
  const tStart = performance.now()
  await Promise.all(workers)
  const wallMs = performance.now() - tStart

  latencies.sort((a, b) => a - b)
  const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0

  console.log(JSON.stringify({
    url,
    total: opts.total,
    concurrency: opts.concurrency,
    wall_ms: Math.round(wallMs),
    status_counts: Object.fromEntries(byStatus),
    latency_ms: { p50: Math.round(p50), p95: Math.round(p95), min: Math.round(latencies[0] ?? 0), max: Math.round(latencies[latencies.length - 1] ?? 0) },
  }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
