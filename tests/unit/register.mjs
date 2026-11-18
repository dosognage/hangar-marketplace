// Lets `node --test` run the TypeScript unit tests with no extra
// dependencies: Node strips the types itself, and this hook resolves the
// "@/..." path alias and extensionless imports the way tsconfig does.
// Used by `npm run test:unit`.
import { registerHooks } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '../..')

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      specifier = pathToFileURL(path.join(root, specifier.slice(2))).href
    }
    const local = specifier.startsWith('.') || specifier.startsWith('file:')
    if (local && !path.extname(specifier)) {
      for (const ext of ['.ts', '.tsx', '/index.ts']) {
        try { return nextResolve(specifier + ext, context) } catch { /* try the next one */ }
      }
    }
    return nextResolve(specifier, context)
  },
})
