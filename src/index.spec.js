import { endent } from '@dword-design/functions'
import tester from '@dword-design/tester'
import testerPluginNuxtConfig from '@dword-design/tester-plugin-nuxt-config'
import testerPluginPuppeteer from '@dword-design/tester-plugin-puppeteer'

export default tester(
  {
    nuxt3: {
      config: {
        modules: ['./modules/foo', './modules/bar'],
      },
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
      nuxtVersion: 3,
      async test() {
        await this.page.goto('http://localhost:3000')
        await this.page.waitForSelector('.bar')
      },
    },
    works: {
      config: {
        modules: ['~/modules/foo', '~/modules/bar'],
      },
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
      async test() {
        await this.page.goto('http://localhost:3000')
        await this.page.waitForSelector('.bar')
      },
    },
  },
  [testerPluginPuppeteer(), testerPluginNuxtConfig()],
)
