import { delay, endent, identity, mapValues } from '@dword-design/functions'
import tester from '@dword-design/tester'
import testerPluginPuppeteer from '@dword-design/tester-plugin-puppeteer'
import testerPluginTmpDir from '@dword-design/tester-plugin-tmp-dir'
import execa from 'execa'
import { outputFile } from 'fs-extra'
import outputFiles from 'output-files'
import P from 'path'
import kill from 'tree-kill-promise'

export default tester(
  {
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
        console.log(await this.page.content())
        await this.page.waitForSelector('.bar')
      },
    },
  },
  [
    testerPluginTmpDir(),
    {
      transform: config => {
        config = { test: () => {}, ...config }

        return async function () {
          await outputFiles({
            'package.json': JSON.stringify({ type: 'module' }),
            ...config.files,
          })
          let versions = {
            'nuxt@3.0.0-rc.11': {
              transformNuxtConfig: nuxtConfig =>
                nuxtConfig
                |> mapValues((value, key) =>
                  key === 'modules'
                    ? value.map(mod =>
                        mod.startsWith('~') ? `.${mod.slice(1)}` : mod
                      )
                    : value
                ),
            },
            'nuxt@^2': {},
          }
          versions =
            versions
            |> mapValues(versionConfig => ({
              transformNuxtConfig: identity,
              ...versionConfig,
            }))
          for (const version of Object.keys(versions)) {
            console.log(version)
            await outputFile(
              'nuxt.config.js',
              `export default ${JSON.stringify({
                build: { quiet: false },
                ...versions[version].transformNuxtConfig(config.nuxtConfig),
              })}`
            )
            await execa.command(`yarn add --dev ${version}`)
            await execa(P.resolve('node_modules', '.bin', 'nuxt'), ['build'])

            const childProcess = execa(
              P.resolve('node_modules', '.bin', 'nuxt'),
              ['start']
            )
            await delay(5000)
            try {
              await config.test.call(this)
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
