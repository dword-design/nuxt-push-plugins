import P from 'path'

export default (self, ...plugins) =>
  plugins.forEach(plugin => {
    const template = self.addTemplate(plugin)
    self.options.plugins.push({
      mode: plugin.mode,
      src: P.join(self.options.buildDir, template.dst),
    })
  })
