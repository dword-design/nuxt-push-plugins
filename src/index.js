import { forEach } from '@dword-design/functions'
import { addPlugin, isNuxt3 as isNuxt3Try } from '@nuxt/kit'
import P from 'path'

export default (self, ...plugins) => {
  forEach(plugins, plugin => {
    let isNuxt3 = true
    try {
      isNuxt3 = isNuxt3Try()
    } catch {
      isNuxt3 = false
    }
    if (isNuxt3) {
      addPlugin(plugin, { append: true })
    } else {
      const template = self.addTemplate(plugin)
      self.options.plugins.push({
        mode: plugin.mode,
        src: P.join(self.options.buildDir, template.dst),
      })
    }
  })
}
