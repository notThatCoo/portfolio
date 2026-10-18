import type { MDXComponents } from "mdx/types";
import type { ComponentProps, ReactNode } from "react";
import { site } from "@/config/site";

/** Highlighted placeholder so unfinished content is obvious, not silently shipped. */
function Todo({ children }: { children: ReactNode }) {
  return (
    <aside className="todo" aria-label="Placeholder">
      <strong>TODO</strong> {children}
    </aside>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

function ResumeDownload() {
  if (!site.resumePdf) return null;
  return (
    <p>
      <a className="button" href={site.resumePdf} download>
        Download PDF
      </a>
    </p>
  );
}

function Anchor({ href = "", ...props }: ComponentProps<"a">) {
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    />
  );
}

const components: MDXComponents = {
  a: Anchor,
  Todo,
  Kbd,
  ResumeDownload,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
