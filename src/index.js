import { forEach } from '@dword-design/functions'
import P from 'path'

export default (self, ...plugins) =>
  forEach(plugins, plugin => {
    const template = self.addTemplate(plugin)
    self.options.plugins.push({
      mode: plugin.mode,
      src: P.join(self.options.buildDir, template.dst),
    })
  })
