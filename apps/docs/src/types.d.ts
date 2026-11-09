// The home page imports the example recordings, and Docusaurus only
// declares SVG and CSS imports.
declare module '*.gif' {
  const src: string;
  export default src;
}
