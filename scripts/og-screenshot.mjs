import { execSync } from 'child_process'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const url = 'http://localhost:5173'
const out = resolve(root, 'public', 'og-preview.png')

const cmd = `"${chrome}" --headless=new --screenshot="${out}" --window-size=1200,630 --hide-scrollbars --force-device-scale-factor=1 --disable-gpu --no-sandbox --virtual-time-budget=5000 "${url}"`

console.log('Capturing OG preview...')
execSync(cmd)
console.log('Saved to:', out)
