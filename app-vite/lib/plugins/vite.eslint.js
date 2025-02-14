import { normalizePath } from 'vite'

import { warning, error, success } from '../utils/logger.js'
import { getLinter } from '../utils/eslint.js'

export async function quasarViteESLintPlugin (quasarConf, compileId) {
  const {
    eslint,
    filter,
    errors,
    warnings,
    fix,
    outputFixes,
    formatter,
    errorFiles
  } = await getLinter(quasarConf, compileId)

  let viteServer
  const { format } = await eslint.loadFormatter(formatter)

  return {
    name: 'quasar:eslint',

    configureServer (server) {
      viteServer = server
    },

    async transform (_, id) {
      if (filter(id) === false || await eslint.isPathIgnored(normalizePath(id)) === true) {
        return null
      }

      const report = await eslint.lintFiles(id)

      if (report[ 0 ] === void 0) {
        return null
      }

      const {
        errorCount, fixableErrorCount,
        warningCount, fixableWarningCount
      } = report[ 0 ]

      if (errors === true && errorCount !== 0) {
        errorFiles.add(id)
        console.log()
        error('Error:', 'LINT')
        console.log()
        this.error(format(report))
      }
      else if (warnings === true && warningCount !== 0) {
        errorFiles.add(id)
        console.log()
        warning('Warning:', 'LINT')
        console.log()
        this.warn(format(report))
      }

      if (fix === true && (fixableErrorCount !== 0 || fixableWarningCount !== 0)) {
        outputFixes(report)
      }

      if (errorFiles.has(id) === true) {
        console.log()
        success(id, 'LINT OK')
        console.log()

        errorFiles.delete(id)
        viteServer.hot.send({
          type: 'full-reload',
          path: '*'
        })
      }

      return null
    }
  }
}
