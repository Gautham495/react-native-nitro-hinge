// docusaurus-plugin-llms copies links from the sources as written, so
// `/reference/api/` or `animations.md` end up in the .md files and in
// llms-full.txt. Agents fetch those files on their own, without the site
// around them, so this rewrites every local link to an absolute URL.
import fs from 'node:fs';
import path from 'node:path';

const site = 'https://gautham495.github.io/react-native-nitro-hinge/';
const build = path.resolve(import.meta.dirname, '../build');

const markdownFiles = fs
  .readdirSync(build, { recursive: true })
  .filter((file) => file.endsWith('.md'));

// Relative links like `animations.md` are resolved by file name, which only
// works while every page has a unique one.
const byName = new Map();
for (const file of markdownFiles) {
  const name = path.basename(file);
  if (byName.has(name)) {
    throw new Error(
      `Two pages are called ${name}: ${byName.get(name)} and ${file}`
    );
  }
  byName.set(name, file);
}

function absolute(link) {
  const [target, hash] = link.split('#');
  const anchor = hash ? `#${hash}` : '';

  if (target.startsWith('/')) {
    const route = target.replace(/^\/|\/$/g, '');
    if (fs.existsSync(path.join(build, `${route}.md`))) {
      return `${site}${route}.md${anchor}`;
    }
    return route ? `${site}${route}/${anchor}` : `${site}${anchor}`;
  }

  if (target.endsWith('.md')) {
    const file = byName.get(path.basename(target));
    if (!file) {
      throw new Error(`No page for the link ${link}`);
    }
    return `${site}${file}${anchor}`;
  }

  return link;
}

for (const file of [...markdownFiles, 'llms-full.txt']) {
  const filePath = path.join(build, file);
  const text = fs.readFileSync(filePath, 'utf8');
  const rewritten = text.replace(
    /\]\((?!https?:|mailto:|#)([^)\s]+)\)/g,
    (_, link) => `](${absolute(link)})`
  );
  fs.writeFileSync(filePath, rewritten);
}
