import P from 'path'
import { forIn } from '@dword-design/functions'

export default (self, ...templates) => templates
  |> forIn(template => {
    const { dst } = self.addTemplate(template)
    self.options.plugins.push({
      src: P.join(self.options.buildDir, dst),
      mode: template.mode,
    })
  })