import fs from 'node:fs';
import path from 'node:path';
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

const repoRoot = path.resolve(__dirname, '../../../..');

// A code block with `file=<path from the repo root>` in its meta is a copy
// of that file. The build fails when they differ, so the pages, llms.txt and
// the Markdown copies can't show stale example code.
export default function codeMatchesFile() {
  return (tree: Root, vfile: { path: string }) => {
    visit(tree, 'code', (node) => {
      const match = node.meta?.match(/(?:^|\s)file=(\S+)/);
      if (!match) {
        return;
      }

      const file = match[1]!;
      const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
      if (node.value !== source.trimEnd()) {
        throw new Error(
          `The code block in ${vfile.path} differs from ${file}. Copy the file into it.`
        );
      }
    });
  };
}
