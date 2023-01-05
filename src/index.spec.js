import { endent } from '@dword-design/functions'
import tester from '@dword-design/tester'
import testerPluginPuppeteer from '@dword-design/tester-plugin-puppeteer'
import testerPluginTmpDir from '@dword-design/tester-plugin-tmp-dir'
import packageName from 'depcheck-package-name'
import { execa, execaCommand } from 'execa'
import fs from 'fs-extra'
import { Builder, Nuxt } from 'nuxt'
import outputFiles from 'output-files'
import { pEvent } from 'p-event'
import P from 'path'
import kill from 'tree-kill-promise'

export default tester(
  {
    nuxt3: {
      files: {
        modules: {
          bar: {
            'index.js': endent`
            import self from '../../../src'

            export default function () {
              self(this, require.resolve('./plugin'))
            }

          `,
            'plugin.js':
              "export default (context, inject) => inject('bar', context.$foo)",
          },
          foo: {
            'index.js': endent`
            import self from '../../../src'

            export default function () {
              self(this, require.resolve('./plugin'))
            }

          `,
            'plugin.js':
              "export default (context, inject) => inject('foo', 'bar')",
          },
        },
        'pages/index.vue': endent`
        <template>
          <div :class="$bar" />
        </template>

      `,
      },
      nuxtConfig: {
        modules: ['./modules/foo', './modules/bar'],
      },
      nuxtVersion: 3,
      async test() {
        await this.page.goto('http://localhost:3000')
        await this.page.waitForSelector('.bar')
      },
    },
    works: {
      files: {
        modules: {
          bar: {
            'index.js': endent`
            import self from '../../../src'

            export default function () {
              self(this, require.resolve('./plugin'))
            }

          `,
            'plugin.js':
              "export default (context, inject) => inject('bar', context.$foo)",
          },
          foo: {
            'index.js': endent`
            import self from '../../../src'

            export default function () {
              self(this, require.resolve('./plugin'))
            }

          `,
            'plugin.js':
              "export default (context, inject) => inject('foo', 'bar')",
          },
        },
        'pages/index.vue': endent`
        <template>
          <div :class="$bar" />
        </template>

      `,
      },
      nuxtConfig: {
        modules: ['~/modules/foo', '~/modules/bar'],
      },
      async test() {
        await this.page.goto('http://localhost:3000')
        await this.page.waitForSelector('.bar')
      },
    },
  },
  [
    testerPluginTmpDir(),
    {
      transform: config => {
        config = { nuxtConfig: {}, nuxtVersion: 2, test: () => {}, ...config }

        return async function () {
          await outputFiles({
            'package.json': JSON.stringify({ type: 'module' }),
            ...config.files,
          })
          if (config.nuxtVersion === 3) {
            await execaCommand('yarn add --dev nuxt')
            await fs.outputFile(
              'nuxt.config.js',
              `export default ${JSON.stringify({
                telemetry: false,
                ...config.nuxtConfig,
              })}`
            )

            const nuxtPath = P.resolve(
              'node_modules',
              '.bin',
              packageName`nuxt`
            )
            await execa(nuxtPath, ['build'])

            const childProcess = execaCommand('node .output/server/index.mjs', {
              all: true,
            })
            await pEvent(childProcess.all, 'data')
            try {
              await config.test.call(this)
            } finally {
              await kill(childProcess.pid)
            }
          } else {
            const nuxt = new Nuxt({
              dev: false,
              ...config.nuxtConfig,
            })
            if (config.error) {
              await expect(new Builder(nuxt).build()).rejects.toThrow(
                config.error
              )
            } else {
              await new Builder(nuxt).build()
              await nuxt.listen()
              try {
                await config.test.call(this)
              } finally {
                await nuxt.close()
              }
            }
          }
        }
      },
    },
    testerPluginPuppeteer(),
  ]
)
