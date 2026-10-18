import { DOCK_APPS } from "@/lib/wm/specs";
import { COMMANDS } from "./commands";
import { lookup, resolvePath, type VDir } from "./vfs";

export interface Completion {
  /** The full input line after completion. */
  value: string;
  /** Candidates to show when the completion is ambiguous. */
  options: string[];
}

function commonPrefix(words: string[]): string {
  if (!words.length) return "";
  let prefix = words[0];
  for (const w of words.slice(1)) {
    while (!w.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

/**
 * Bash-like completion of the last word: commands in first position, paths
 * after that (directories get a trailing "/"), plus app names for `open`.
 * Unique match → complete it; several → extend to the common prefix and list them.
 */
export function complete(input: string, cwd: string[], fs: VDir): Completion {
  const words = input.split(/\s+/);
  const current = words[words.length - 1];
  const isCommand = words.length === 1;

  let candidates: string[];
  let stem = current;
  let dirPart = "";

  if (isCommand) {
    candidates = Object.keys(COMMANDS);
  } else {
    const slash = current.lastIndexOf("/");
    dirPart = slash >= 0 ? current.slice(0, slash + 1) : "";
    stem = current.slice(slash + 1);
    const dir = lookup(fs, resolvePath(cwd, dirPart || "."));
    candidates =
      dir?.kind === "dir"
        ? [...dir.children.values()].map((c) => (c.kind === "dir" ? `${c.name}/` : c.name))
        : [];
    if (words[0] === "open" && !dirPart) candidates.push(...DOCK_APPS);
    if (words[0] === "help" && words.length === 2) candidates = Object.keys(COMMANDS);
    if (words[0] === "theme" && words.length === 2) candidates = ["light", "dark"];
  }

  const matches = [...new Set(candidates.filter((c) => c.startsWith(stem)))].sort();
  if (!matches.length) return { value: input, options: [] };

  const head = words.slice(0, -1).join(" ");
  const join = (word: string) => (head ? `${head} ${word}` : word);

  if (matches.length === 1) {
    const done = matches[0];
    const suffix = done.endsWith("/") ? "" : " ";
    return { value: join(dirPart + done) + suffix, options: [] };
  }
  return { value: join(dirPart + commonPrefix(matches)), options: matches };
}
