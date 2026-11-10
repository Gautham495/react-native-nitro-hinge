import Head from '@docusaurus/Head';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import Metadata from '@theme-original/DocItem/Metadata';

// Points agents that land on a page's HTML to its Markdown copy, which
// docusaurus-plugin-llms writes next to it: /intro/ -> /intro.md.
export default function MetadataWithMarkdown() {
  const { metadata } = useDoc();
  const markdown = `${metadata.permalink.replace(/\/$/, '')}.md`;

  return (
    <>
      <Metadata />
      <Head>
        <link rel="alternate" type="text/markdown" href={markdown} />
      </Head>
    </>
  );
}
