const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

// Extract all inline scripts
const scripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
assert(scripts.length === 2, 'Must have exactly 2 inline script blocks (tailwind config + main app logic)');
const scriptCode = scripts[1][1];

// Mock minimal DOM environment for unit test
class MockClassList {
  constructor() { this.classes = new Set(); }
  add(...cls) { cls.forEach(c => this.classes.add(c)); }
  remove(...cls) { cls.forEach(c => this.classes.delete(c)); }
  toggle(c) { this.classes.has(c) ? this.classes.delete(c) : this.classes.add(c); }
  contains(c) { return this.classes.has(c); }
}

class MockElement {
  constructor(id = '', tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.classList = new MockClassList();
    this.style = {};
    this.attributes = {};
    this.children = [];
    this.textContent = '';
    this.innerHTML = '';
    this.checked = false;
    this.scrollLeft = 0;
    this.scrollWidth = 1000;
    this.clientWidth = 500;
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  closest(selector) { return this; }
  querySelector(sel) { return new MockElement(); }
  querySelectorAll(sel) { return []; }
  addEventListener(event, cb) { this.listener = cb; }
  scrollTo() {}
  scrollBy() {}
  appendChild(child) { this.children.push(child); }
}

const elements = {};
function getOrCreate(id) {
  if (!elements[id]) elements[id] = new MockElement(id);
  return elements[id];
}

const mockDocument = {
  getElementById: (id) => getOrCreate(id),
  querySelectorAll: (selector) => {
    if (selector === '.article-filter-btn') return [new MockElement(), new MockElement()];
    if (selector === '.article-loop-card') {
      const c1 = new MockElement(); c1.setAttribute('data-category', 'investigasi');
      const c2 = new MockElement(); c2.setAttribute('data-category', 'riset');
      return [c1, c2];
    }
    return [];
  },
  createElement: (tag) => new MockElement('', tag),
  body: new MockElement('body')
};

const mockWindow = {
  scrollY: 100,
  addEventListener: () => {},
  requestAnimationFrame: (cb) => cb()
};

// Evaluate script inside mock context
const fn = new Function('document', 'window', 'lucide', scriptCode + `
  return {
    calculateErgoScore,
    filterArticles,
    openNewsModal,
    closeNewsModal,
    newsData
  };
`);

const exported = fn(mockDocument, mockWindow, { createIcons: () => {} });

// Unit Test 1: newsData completeness
console.log('Testing newsData...');
assert(Object.keys(exported.newsData).length >= 7, 'Must have at least 7 articles');
assert(exported.newsData['survei-2026'].title.includes('74%'), 'survei-2026 title correct');
assert(exported.newsData['kisah-adrian'].tag === 'Kisah Nyata', 'kisah-adrian tag correct');
console.log('✔ newsData test passed!');

// Unit Test 2: calculateErgoScore
console.log('Testing calculateErgoScore...');
const m = getOrCreate('check-monitor');
const r = getOrCreate('check-rest');
const w = getOrCreate('check-wrist');
const l = getOrCreate('check-light');

// Test 100%
m.checked = true; r.checked = true; w.checked = true; l.checked = true;
exported.calculateErgoScore();
assert.strictEqual(getOrCreate('ergo-percentage').textContent, '100%');
assert.strictEqual(getOrCreate('ergo-verdict-title').textContent, 'Postur & Lingkungan Kerja Teladan');

// Test 50%
m.checked = true; r.checked = true; w.checked = false; l.checked = false;
exported.calculateErgoScore();
assert.strictEqual(getOrCreate('ergo-percentage').textContent, '50%');
assert.strictEqual(getOrCreate('ergo-verdict-title').textContent, 'Waspada Kelelahan Kumulatif');

// Test 0%
m.checked = false; r.checked = false; w.checked = false; l.checked = false;
exported.calculateErgoScore();
assert.strictEqual(getOrCreate('ergo-percentage').textContent, '0%');
assert.strictEqual(getOrCreate('ergo-verdict-title').textContent, 'Setup Koding Berisiko Tinggi');
console.log('✔ calculateErgoScore test passed!');

// Unit Test 3: filterArticles
console.log('Testing filterArticles...');
const mockBtn = new MockElement();
exported.filterArticles('riset', mockBtn);
assert(mockBtn.classList.contains('neu-extruded-sm'), 'Active button should have neu-extruded-sm');
console.log('✔ filterArticles test passed!');

// Unit Test 4: openNewsModal and closeNewsModal
console.log('Testing modal open/close...');
exported.openNewsModal('survei-2026');
assert.strictEqual(getOrCreate('modal-title').textContent, exported.newsData['survei-2026'].title);
assert(!getOrCreate('story-modal').classList.contains('hidden'), 'Modal should not have hidden');
exported.closeNewsModal();
assert(getOrCreate('story-modal').classList.contains('hidden'), 'Modal should have hidden');
console.log('✔ openNewsModal & closeNewsModal test passed!');

console.log('\n========================================');
console.log('ALL UNIT TESTS PASSED (100% SUCCESS)');
console.log('========================================');
