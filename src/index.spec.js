import { endent, mapValues } from '@dword-design/functions'
import puppeteer from '@dword-design/puppeteer'
import { Builder, Nuxt } from 'nuxt'
import outputFiles from 'output-files'
import withLocalTmpDir from 'with-local-tmp-dir'

let browser
let page
const runTest = config => () =>
  withLocalTmpDir(async () => {
    await outputFiles(config.files)
    const nuxt = new Nuxt({ createRequire: 'native', dev: false, ...config.nuxtConfig })
    await new Builder(nuxt).build()
    await nuxt.listen()
    await page.goto('http://localhost:3000')
    try {
      await config.test()
    } finally {
      await nuxt.close()
    }
  })

export default {
  after: () => browser.close(),
  before: async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage()
  },
  ...({
    valid: {
      files: {
        modules: {
          bar: {
            'index.js': endent`
              import self from '../../../src'

              export default function () {
                self(this, require.resolve('./plugin'))
              }

            `,
            'plugin.js': endent`
              export default (context, inject) =>
                inject('bar', 'foo')

            `,
          },
          foo: {
            'index.js': endent`
              import self from '../../../src'

              export default function () {
                self(this, require.resolve('./plugin'))
              }

            `,
            'plugin.js': endent`
              export default (context, inject) =>
                inject('foo', context.app.$bar)

            `,
          },
        },
        'pages/index.vue': endent`
          <script>
          export default {
            render() {
              return <div class={this.$foo} />
            }
          }
          </script>

        `,
      },
      nuxtConfig: {
        modules: ['~/modules/bar', '~/modules/foo'],
      },
      test: () => page.waitForSelector('.foo'),
    },
  } |> mapValues(runTest)),
}
