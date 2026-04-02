import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST_DIR = new URL('../dist', import.meta.url)
const REPORT_FILE = new URL('../dist/secret-scan-report.json', import.meta.url)
const SECRET_PATTERNS = ['JWT_SECRET', 'AI_SERVICE_INTERNAL_KEY', 'OPENROUTER_API_KEY']

function listFiles(dirPath, files = []) {
  for (const entry of readdirSync(dirPath)) {
    const entryPath = join(dirPath, entry)
    const stats = statSync(entryPath)
    if (stats.isDirectory()) {
      listFiles(entryPath, files)
      continue
    }
    files.push(entryPath)
  }
  return files
}

const distPath = fileURLToPath(DIST_DIR)
const reportPath = fileURLToPath(REPORT_FILE)
const files = listFiles(distPath).sort()
const findings = []

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  for (const pattern of SECRET_PATTERNS) {
    if (content.includes(pattern)) {
      findings.push({
        file: relative(distPath, file),
        pattern,
      })
    }
  }
}

findings.sort((a, b) => {
  if (a.file === b.file) return a.pattern.localeCompare(b.pattern)
  return a.file.localeCompare(b.file)
})

const report = {
  tool: 'scan-secrets-dist',
  version: 1,
  dist_dir: 'dist',
  patterns: SECRET_PATTERNS,
  files_scanned: files.length,
  matches: findings,
  passed: findings.length === 0,
}

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

if (findings.length > 0) {
  console.error('Secret token names found in frontend dist output:')
  for (const finding of findings) {
    console.error(`- ${finding.pattern}: ${finding.file}`)
  }
  console.error(`Scan report written: ${reportPath}`)
  process.exit(1)
}

console.log('Secret scan passed: no secret token names found in dist.')
console.log(`Scan report written: ${reportPath}`)
