import { endent } from '@dword-design/functions'
import tester from '@dword-design/tester'
import testerPluginPuppeteer from '@dword-design/tester-plugin-puppeteer'
import testerPluginTmpDir from '@dword-design/tester-plugin-tmp-dir'
import { execa, execaCommand } from 'execa'
import fs from 'fs-extra'
import nuxtDevReady from 'nuxt-dev-ready'
import ora from 'ora'
import outputFiles from 'output-files'
import P from 'path'
import kill from 'tree-kill-promise'

export default tester(
  {
    async nuxt2() {
      await outputFiles({
        modules: {
          1: {
            'index.js': endent`
              import { createRequire } from 'module'

              import self from '../../../src/index.js'

              const _require = createRequire(import.meta.url)

              export default function () {
                self(this, _require.resolve('./plugin'))
              }
            `,
            'plugin.js':
              "export default (context, inject) => inject('bar', context.$foo)",
          },
          2: {
            'index.js': endent`
              import { createRequire } from 'module'

              import self from '../../../src/index.js'

              const _require = createRequire(import.meta.url)

              export default function () {
                self(this, _require.resolve('./plugin'))
              }
            `,
            'plugin.js':
              "export default (context, inject) => inject('foo', 'bar')",
          },
        },
        'nuxt.config.js': endent`
          export default {
            modules: ['~/modules/1', '~/modules/2'],
          }
        `,
        'pages/index.vue': endent`
          <template>
            <div :class="$bar" />
          </template>
        `,
      })
      await fs.symlink(
        P.join('..', 'node_modules', '.cache', 'nuxt2', 'node_modules'),
        'node_modules',
      )

      const nuxt = execa(P.join('node_modules', '.bin', 'nuxt'), ['dev'])
      try {
        await nuxtDevReady()
        await this.page.goto('http://localhost:3000')
        await this.page.waitForSelector('.bar')
      } finally {
        await kill(nuxt.pid)
      }
    },
    async works() {
      await outputFiles({
        modules: {
          1: {
            'index.js': endent`
              import self from '../../../src'

              export default function () {
                self(this, require.resolve('./plugin'))
              }
            `,
            'plugin.js':
              "export default (context, inject) => inject('foo', 'bar')",
          },
          2: {
            'index.js': endent`
              import self from '../../../src'

              export default function () {
                self(this, require.resolve('./plugin'))
              }
            `,
            'plugin.js':
              "export default (context, inject) => inject('bar', context.$foo)",
          },
        },
        'pages/index.vue': endent`
          <template>
            <div :class="$bar" />
          </template>

        `,
      })

      const nuxt = execaCommand('nuxt dev')
      try {
        await nuxtDevReady()
        await this.page.goto('http://localhost:3000')
        await this.page.waitForSelector('.bar')
      } finally {
        await kill(nuxt.pid)
      }
    },
  },
  [
    testerPluginTmpDir(),
    testerPluginPuppeteer(),
    {
      before: async () => {
        await fs.outputFile(
          P.join('node_modules', '.cache', 'tester', 'nuxt2', 'package.json'),
          JSON.stringify({}),
        )

        const spinner = ora('Installing Nuxt 2').start()
        await execaCommand('yarn add nuxt@^2', {
          cwd: P.join('node_modules', '.cache', 'tester', 'nuxt2'),
          stderr: 'inherit',
        })
        spinner.stop()
      },
    },
  ],
)
