import { delay, endent, isEqual, mapValues } from '@dword-design/functions'
import puppeteer from '@dword-design/puppeteer'
import execa from 'execa'
import outputFiles from 'output-files'
import pWaitFor from 'p-wait-for'
import P from 'path'
import withLocalTmpDir from 'with-local-tmp-dir'
import kill from 'tree-kill-promise'
import { outputFile } from 'fs-extra'

let browser
let page

const runTest = config => {
  config = { consoleMessages: [], test: () => {}, ...config }

  return () =>
    withLocalTmpDir(async () => {
      await outputFiles({
        'package.json': JSON.stringify({ type: 'module' }),
        ...config.files,
      })
      const versions = {
        2: 'nuxt',
        3: 'nuxt@3.0.0-rc.11'
      }
      for (const version in versions) {
        console.log(versions[version])
        await outputFile('nuxt.config.js', `export default ${JSON.stringify({ build: { quiet: false }, ...config.nuxtConfigs[version] })}`),
        await execa.command(`yarn add --dev ${versions[version]}`)
        await execa(P.resolve('node_modules', '.bin', 'nuxt'), ['build'])
        const childProcess = execa(P.resolve('node_modules', '.bin', 'nuxt'), ['start'])
        await delay(2000)

        const messages = []

        const consoleHandler = message => messages.push(message.text())
        page.on('console', consoleHandler)
        await page.goto('http://localhost:3000')
        if (config.consoleMessages.length > 0) {
          await pWaitFor(() => messages |> isEqual(config.consoleMessages))
        }
        page.off('console', consoleHandler)
        try {
          await config.test()
        } finally {
          await kill(childProcess.pid)
        }
      }
    })
}

export default {
  after: () => browser.close(),
  before: async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage()
  },
  ...({
    works: {
      consoleMessages: ['foo', 'bar'],
      files: {
        modules: {
          bar: {
            'index.js': endent`
              import self from '../../../src'

             export default function () {
                self(this, require.resolve('./plugin'))
              }

            `,
            'plugin.js': "export default () => console.log('bar')",
          },
          foo: {
            'index.js': endent`
              import self from '../../../src'

              export default function () {
                self(this, require.resolve('./plugin'))
              }

            `,
            'plugin.js': "export default () => console.log('foo')",
          },
        },
        'pages/index.vue': endent`
          <template>
            <div />
          </template>

        `,
      },
      nuxtConfigs: {
        2: {
          modules: ['~/modules/foo', '~/modules/bar'],
        },
        3: {
          modules: ['./modules/foo', './modules/bar'],
        },
      }
    },
  }) |> mapValues(runTest),
}
