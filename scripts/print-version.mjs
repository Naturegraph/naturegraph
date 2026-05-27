/**
 * Affiche la nouvelle version apres bump et rappelle le workflow release.
 * Appele par npm run release:patch / minor / major.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'))

console.log('')
console.log(`  package.json bumped a v${pkg.version}`)
console.log('')
console.log('  Prochaines etapes :')
console.log('    1. git add package.json package-lock.json')
console.log(`    2. git commit -m "chore(release): v${pkg.version}"`)
console.log('    3. git push origin develop')
console.log('    4. Rediger release notes (docs/devops/releases/)')
console.log('    5. Soumettre PR develop -> main')
console.log(`    6. Apres merge : git tag -a v${pkg.version} -m "Release v${pkg.version}"`)
console.log('    7. git push origin v' + pkg.version)
console.log('    8. git push origin origin/main:staging --force (reset staging)')
console.log('')
