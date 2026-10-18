declare module "*.mdx" {
  import type { MDXContent } from "mdx/types";
  export const frontmatter: unknown;
  const Component: MDXContent;
  export default Component;
}
