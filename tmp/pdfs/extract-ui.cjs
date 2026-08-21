const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(process.argv[3] || 'src/app/(app)');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.tsx') && ((process.argv[3] && process.argv[3] !== 'src/app/(app)') || entry.name === 'page.tsx')) files.push(full);
  }
}
walk(root);

const interestingProps = new Set([
  'title', 'label', 'name', 'description', 'subtitle', 'caption', 'heading',
  'placeholder', 'aria-label', 'emptyLabel', 'emptyMessage', 'helperText',
]);
const clean = (s) => s.replace(/\s+/g, ' ').trim();

const requested = (process.argv[2] || '').toLowerCase();
for (const file of files.sort().filter((file) => !requested || file.toLowerCase().includes(requested))) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const values = new Set();
  function add(value) {
    const text = clean(value || '');
    if (text.length >= 2 && text.length <= 240 && /[A-Za-z]/.test(text) && !/^(https?:|\/api\/|@\/|[a-z-]+:\s)/.test(text)) values.add(text);
  }
  function visit(node) {
    if (ts.isJsxText(node)) add(node.text);
    if (ts.isJsxAttribute(node) && interestingProps.has(node.name.getText(sf))) {
      if (node.initializer && ts.isStringLiteral(node.initializer)) add(node.initializer.text);
    }
    if (ts.isPropertyAssignment(node)) {
      const prop = node.name.getText(sf).replace(/["']/g, '');
      if (interestingProps.has(prop) && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) add(node.initializer.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  console.log(`\n## ${path.relative(root, file).replace(/\\/g, '/')}`);
  for (const value of values) console.log(`- ${value}`);
}
