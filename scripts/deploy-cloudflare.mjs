import { spawnSync } from 'node:child_process'
import { access } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import {
  CLOUDFLARE_PAGES_DOMAIN,
  CLOUDFLARE_PAGES_PRODUCTION_BRANCH,
  CLOUDFLARE_PAGES_PROJECT_NAME,
} from '../config/site.mjs'

const DIST_DIR = 'dist'
const rawArgs = process.argv.slice(2)
const skipBuild = rawArgs.includes('--skip-build')
const skipDomain = rawArgs.includes('--skip-domain')
const forwardedArgs = rawArgs.filter((arg) => arg !== '--skip-build' && arg !== '--skip-domain')

if (forwardedArgs.includes('--help') || forwardedArgs.includes('-h')) {
  console.log(`Usage: npm run deploy:cf -- [wrangler pages deploy options]\n\nCustom options:\n  --skip-build    Reuse the existing dist/ directory instead of running npm run build.\n  --skip-domain   Do not check or configure the production custom domain after deployment.\n\nEnvironment / config:\n  CLOUDFLARE_PAGES_PROJECT_NAME       Pages project name (default: ${CLOUDFLARE_PAGES_PROJECT_NAME})\n  CLOUDFLARE_PAGES_BRANCH             Override the deployment branch\n  CLOUDFLARE_PAGES_PRODUCTION_BRANCH  Production branch (default: ${CLOUDFLARE_PAGES_PRODUCTION_BRANCH})\n  CLOUDFLARE_PAGES_DOMAIN             Production custom domain (default: ${CLOUDFLARE_PAGES_DOMAIN})\n  CLOUDFLARE_ACCOUNT_ID               Required for automatic custom-domain setup\n  CLOUDFLARE_API_TOKEN                Required for automatic custom-domain setup\n\nExamples:\n  npm run deploy:cf\n  npm run deploy:cf -- --branch preview\n  npm run deploy:cf -- --skip-build --branch main\n  npm run deploy:cf -- --skip-domain`)
  process.exit(0)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    ...options,
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function runBuild() {
  const packageManagerCli = process.env.npm_execpath

  if (packageManagerCli) {
    run(process.execPath, [packageManagerCli, 'run', 'build'])
    return
  }

  if (process.platform === 'win32') {
    run('cmd.exe', ['/d', '/s', '/c', 'npm run build'])
  } else {
    run('npm', ['run', 'build'])
  }
}

function git(args) {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })

  if (result.status !== 0) return ''
  return result.stdout.trim()
}

function hasOption(name) {
  return forwardedArgs.some((arg) => arg === name || arg.startsWith(`${name}=`))
}

function readOption(name) {
  const inline = forwardedArgs.find((arg) => arg.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)

  const index = forwardedArgs.indexOf(name)
  if (index >= 0 && forwardedArgs[index + 1] && !forwardedArgs[index + 1].startsWith('--')) {
    return forwardedArgs[index + 1]
  }

  return ''
}

async function cloudflareRequest(path, { method = 'GET', body } = {}) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error(`Cloudflare API returned HTTP ${response.status} without JSON`)
  }

  if (!response.ok || payload.success === false) {
    const message = Array.isArray(payload.errors)
      ? payload.errors.map((error) => error.message).filter(Boolean).join('; ')
      : ''
    throw new Error(`Cloudflare API request failed (${response.status})${message ? `: ${message}` : ''}`)
  }

  return payload
}

async function ensureProductionDomain(projectName) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN

  if (!accountId || !apiToken) {
    console.warn(
      `Production domain ${CLOUDFLARE_PAGES_DOMAIN} was not checked automatically. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN, or attach it once in Pages > Custom domains.`,
    )
    return
  }

  const basePath = `/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/domains`
  const domains = await cloudflareRequest(basePath)
  const existing = Array.isArray(domains.result)
    ? domains.result.find((domain) => domain.name === CLOUDFLARE_PAGES_DOMAIN)
    : undefined

  if (existing) {
    console.log(`Custom domain: ${CLOUDFLARE_PAGES_DOMAIN} (${existing.status || 'configured'})`)
    return
  }

  const created = await cloudflareRequest(basePath, {
    method: 'POST',
    body: { name: CLOUDFLARE_PAGES_DOMAIN },
  })
  console.log(
    `Custom domain added: ${CLOUDFLARE_PAGES_DOMAIN} (${created.result?.status || 'pending'})`,
  )
}

if (!skipBuild) runBuild()

try {
  await access(join(DIST_DIR, 'index.html'))
} catch {
  console.error('dist/index.html is missing. Run the production build before deploying.')
  process.exit(1)
}

const projectName = readOption('--project-name') || CLOUDFLARE_PAGES_PROJECT_NAME
const detectedBranch =
  process.env.CLOUDFLARE_PAGES_BRANCH ||
  process.env.GITHUB_HEAD_REF ||
  process.env.GITHUB_REF_NAME ||
  git(['rev-parse', '--abbrev-ref', 'HEAD'])
const branch = detectedBranch && detectedBranch !== 'HEAD' ? detectedBranch : ''
const deploymentBranch = readOption('--branch') || branch
const commitHash = process.env.GITHUB_SHA || git(['rev-parse', 'HEAD'])
const commitMessage = git(['log', '-1', '--pretty=%s'])

const wranglerArgs = ['pages', 'deploy', DIST_DIR]

if (!hasOption('--project-name')) wranglerArgs.push('--project-name', projectName)
if (!hasOption('--branch') && branch) wranglerArgs.push('--branch', branch)
if (!hasOption('--commit-hash') && commitHash) wranglerArgs.push('--commit-hash', commitHash)
if (!hasOption('--commit-message') && commitMessage) {
  wranglerArgs.push('--commit-message', commitMessage)
}

wranglerArgs.push(...forwardedArgs)

const require = createRequire(import.meta.url)
let wranglerPackagePath
try {
  wranglerPackagePath = require.resolve('wrangler/package.json')
} catch {
  console.error('Wrangler is not installed. Install project dependencies first.')
  process.exit(1)
}

const wranglerBin = join(dirname(wranglerPackagePath), 'bin', 'wrangler.js')

console.log(`Deploying ${DIST_DIR}/ to Cloudflare Pages`)
console.log(`Project: ${projectName}`)
console.log(`Branch: ${deploymentBranch || '(Wrangler default)'}`)
console.log(`Production branch: ${CLOUDFLARE_PAGES_PRODUCTION_BRANCH}`)
console.log(`Production domain: https://${CLOUDFLARE_PAGES_DOMAIN}`)
if (commitHash) console.log(`Commit: ${commitHash.slice(0, 12)}`)

run(process.execPath, [wranglerBin, ...wranglerArgs])

if (skipDomain) {
  console.log('Custom-domain setup skipped by --skip-domain.')
} else if (!deploymentBranch) {
  console.warn('Deployment branch could not be determined; custom-domain setup was skipped.')
} else if (deploymentBranch !== CLOUDFLARE_PAGES_PRODUCTION_BRANCH) {
  console.log(`Preview branch ${deploymentBranch}: production custom domain was not modified.`)
} else {
  try {
    await ensureProductionDomain(projectName)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
