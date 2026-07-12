const fs = require('fs');

const sql = fs.readFileSync('supabase/seed.sql', 'utf8');

const categoriesMatch = sql.match(/insert into categories \(name, sort_order\) values\s+([\s\S]+?)on conflict/i);
const productsMatch = sql.match(/insert into products \(code, name, description, price, category_id\) values\s+([\s\S]+?);/i);

let categoriesCode = [];
let categoryNameToId = {};

if (categoriesMatch) {
  const catLines = categoriesMatch[1].split('\n').map(l => l.trim()).filter(l => l && l.startsWith('('));
  catLines.forEach((line, index) => {
    // line looks like: ('NUEVOS INGRESOS !', 0),
    const m = line.match(/\('([^']+)',\s*(\d+)\)/);
    if (m) {
      const id = `cat-${index + 1}`;
      categoriesCode.push({ id, name: m[1], sort_order: parseInt(m[2]) });
      categoryNameToId[m[1]] = id;
    }
  });
}

let productsCode = [];

if (productsMatch) {
  const prodLines = productsMatch[1].split('\n').map(l => l.trim()).filter(l => l && l.startsWith('('));
  prodLines.forEach((line, index) => {
    // line looks like: ('316', 'Aceite coco...', '', 4000, (select id from categories where name = 'NUEVOS INGRESOS !')),
    // Be careful with escaped quotes or missing descriptions.
    // simpler regex for this specific format
    const m = line.match(/\('([^']*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*([\d.]+),\s*\(select id from categories where name = '([^']+)'\)\)/);
    if (m) {
      const id = `prod-${index + 1}`;
      const code = m[1];
      const name = m[2].replace(/''/g, "'");
      const description = m[3].replace(/''/g, "'");
      const price = parseFloat(m[4]);
      const catName = m[5];
      const category_id = categoryNameToId[catName];
      productsCode.push({ id, category_id, code, name, description, price, active: true });
    }
  });
}

const out = `export const MOCK_CATEGORIES = ${JSON.stringify(categoriesCode, null, 2)};\n\nexport const MOCK_PRODUCTS = ${JSON.stringify(productsCode, null, 2)};\n`;
fs.writeFileSync('src/lib/mockData.js', out);
console.log('mockData.js created successfully.');
