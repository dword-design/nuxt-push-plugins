import { delay, endent, identity, mapValues } from '@dword-design/functions'
import tester from '@dword-design/tester'
import testerPluginPuppeteer from '@dword-design/tester-plugin-puppeteer'
import testerPluginTmpDir from '@dword-design/tester-plugin-tmp-dir'
import packageName from 'depcheck-package-name'
import execa from 'execa'
import { outputFile, remove, symlink } from 'fs-extra'
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
      after: () => Promise.all([remove('nuxt2'), remove('nuxt3')]),
      before: () =>
        Promise.all([
          (async () => {
            await outputFile(
              P.join('nuxt2', 'package.json'),
              JSON.stringify({})
            )
            await execa.command('yarn add --dev nuxt', { cwd: 'nuxt2' })
          })(),
          (async () => {
            await outputFile(
              P.join('nuxt3', 'package.json'),
              JSON.stringify({})
            )
            await execa.command('yarn add --dev nuxt@3.0.0-rc.12', {
              cwd: 'nuxt3',
            })
          })(),
        ]),
      transform: config => {
        config = { test: () => {}, ...config }

        return async function () {
          await outputFiles({
            'package.json': JSON.stringify({ type: 'module' }),
            ...config.files,
          })
          let versions = {
            2: {},
            3: {
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
          }
          versions =
            versions
            |> mapValues(versionConfig => ({
              transformNuxtConfig: identity,
              ...versionConfig,
            }))
          for (const version of Object.keys(versions)) {
            console.log(version)
            await remove('node_modules')
            await symlink(
              P.join('..', `nuxt${version}`, 'node_modules'),
              'node_modules'
            )
            await outputFile(
              'nuxt.config.js',
              `export default ${JSON.stringify({
                build: { quiet: false },
                rootDir: process.cwd(),
                telemetry: false,
                ...versions[version].transformNuxtConfig(config.nuxtConfig),
              })}`
            )

            const nuxtPath = P.resolve(
              'node_modules',
              '.bin',
              packageName`nuxt`
            )
            await execa(nuxtPath, ['build'], { stdio: 'inherit' })

            const childProcess = execa(nuxtPath, ['start'], {
              stdio: 'inherit',
            })
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
