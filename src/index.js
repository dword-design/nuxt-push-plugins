import { forEach } from '@dword-design/functions'

export default (self, ...plugins) =>
  forEach(plugins, plugin => {
    self.addTemplate(plugin)
    self.options.plugins.push(plugin)
  })
