import { highlight } from "fumadocs-core/highlight"
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock"

import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from "@/components/docs/mdx/docs-code-block"
import {
  convertLines,
  packageManagers,
} from "@/lib/package-manager-commands"

/**
 * An npm command as pnpm / npm / yarn / bun tabs, like the docs' ```npm
 * blocks. Shares their `package-manager` choice, saved in the browser.
 */
export async function InstallCommandTabs({
  command,
  className,
}: {
  command: string
  className?: string
}) {
  const tabs = await Promise.all(
    packageManagers.map(async (manager) => ({
      manager,
      code: await highlight(convertLines(command, manager), {
        lang: "bash",
        themes: { light: "github-light", dark: "github-dark" },
        components: { pre: (props) => <Pre {...props} /> },
      }),
    }))
  )

  return (
    <CodeBlockTabs
      defaultValue={packageManagers[0]}
      groupId="package-manager"
      persist
      className={className}
    >
      <CodeBlockTabsList>
        {packageManagers.map((manager) => (
          <CodeBlockTabsTrigger key={manager} value={manager}>
            {manager}
          </CodeBlockTabsTrigger>
        ))}
      </CodeBlockTabsList>
      {tabs.map(({ manager, code }) => (
        <CodeBlockTab key={manager} value={manager}>
          <CodeBlock>{code}</CodeBlock>
        </CodeBlockTab>
      ))}
    </CodeBlockTabs>
  )
}
