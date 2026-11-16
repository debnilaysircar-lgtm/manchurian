// Turns the single-file demo build into a page fragment for hosting as a claude.ai Artifact:
// the host supplies <!doctype>, <head> and <body>, so only title, styles, root element and script remain.
import fs from 'node:fs';

const [src = 'dist-demo/index.html', out = 'dist-demo/manchurian-erp.html'] = process.argv.slice(2);
const html = fs.readFileSync(src, 'utf8');
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({ attrs: m[1], code: m[2] }));
if (!styles.length || scripts.length !== 1) throw new Error(`Unexpected build output: ${styles.length} styles, ${scripts.length} scripts`);
// Inside an inline <script>, "</script" or "<!--" in the code would end or confuse the element.
const code = scripts[0].code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const page = [
  '<title>Manchurian ERP</title>',
  '<meta name="description" content="SAP-style ERP demo with finance, sales, purchasing, inventory, configuration and IDoc exchange, running in the browser.">',
  `<style>${styles.join('\n')}</style>`,
  '<div id="root"></div>',
  `<script type="module">${code}</script>`,
].join('\n');
fs.writeFileSync(out, page);
console.log(`${out}: ${(page.length / 1024 / 1024).toFixed(2)} MB`);
