/**
 * Shell-style tokenizer: whitespace splits words, single quotes are literal,
 * double quotes allow \" and \\ escapes, and a backslash escapes the next char
 * outside quotes. Unterminated quotes are an error, like a real shell.
 */
export class ParseError extends Error {}

export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inToken = false;
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote === "'") {
      if (ch === "'") quote = null;
      else current += ch;
      continue;
    }
    if (quote === '"') {
      if (ch === '"') quote = null;
      else if (ch === "\\" && (input[i + 1] === '"' || input[i + 1] === "\\"))
        current += input[++i];
      else current += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      inToken = true;
    } else if (ch === "\\" && i + 1 < input.length) {
      current += input[++i];
      inToken = true;
    } else if (/\s/.test(ch)) {
      if (inToken) tokens.push(current);
      current = "";
      inToken = false;
    } else {
      current += ch;
      inToken = true;
    }
  }
  if (quote) throw new ParseError(`unterminated ${quote === '"' ? "double" : "single"} quote`);
  if (inToken) tokens.push(current);
  return tokens;
}

export interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | true>;
}

/**
 * Minimal flag parser: `--name value`, `--name=value`, `-abc` (booleans).
 * `--` ends flag parsing. Flags listed in `booleans` never consume a value.
 */
export function parseArgs(args: string[], booleans: string[] = []): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--") {
      positional.push(...args.slice(i + 1));
      break;
    }
    if (a.startsWith("--") && a.length > 2) {
      const eq = a.indexOf("=");
      const name = eq > 0 ? a.slice(2, eq) : a.slice(2);
      const value = eq > 0 ? a.slice(eq + 1) : undefined;
      if (value !== undefined) flags[name] = value;
      else if (!booleans.includes(name) && i + 1 < args.length && !/^--?[a-z]/i.test(args[i + 1])) {
        flags[name] = args[++i];
      } else flags[name] = true;
    } else if (/^-[a-z]+$/i.test(a)) {
      for (const f of a.slice(1)) flags[f] = true;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}
