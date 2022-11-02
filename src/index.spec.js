import { delay, endent, isEqual } from '@dword-design/functions'
import tester from '@dword-design/tester'
import testerPluginPuppeteer from '@dword-design/tester-plugin-puppeteer'
import testerPluginTmpDir from '@dword-design/tester-plugin-tmp-dir'
import execa from 'execa'
import { outputFile } from 'fs-extra'
import outputFiles from 'output-files'
import pWaitFor from 'p-wait-for'
import P from 'path'
import kill from 'tree-kill-promise'

export default tester(
  {
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
      },
    },
  },
  [
    testerPluginTmpDir(),
    {
      transform: config => {
        config = { consoleMessages: [], test: () => {}, ...config }

        return async function () {
          await outputFiles({
            'package.json': JSON.stringify({ type: 'module' }),
            ...config.files,
          })

          const versions = {
            2: 'nuxt@^2',
            3: 'nuxt@3.0.0-rc.11',
          }
          for (const version of Object.keys(versions)) {
            console.log(versions[version])
            await outputFile(
              'nuxt.config.js',
              `export default ${JSON.stringify({
                build: { quiet: false },
                ...config.nuxtConfigs[version],
              })}`
            )
            await execa.command(`yarn add --dev ${versions[version]}`)
            await execa(P.resolve('node_modules', '.bin', 'nuxt'), ['build'])

            const childProcess = execa(
              P.resolve('node_modules', '.bin', 'nuxt'),
              ['start']
            )
            await delay(3000)

            const messages = []

            const consoleHandler = message => {
              messages.push(message.text())
              console.log(messages)
            }
            this.page.on('console', consoleHandler)
            await this.page.goto('http://localhost:3000')
            if (config.consoleMessages.length > 0) {
              await pWaitFor(() => messages |> isEqual(config.consoleMessages))
            }
            this.page.off('console', consoleHandler)
            try {
              await config.test()
            } finally {
              await kill(childProcess.pid)
            }
          }
        }
      },
    },
    testerPluginPuppeteer(),
  ]
)
