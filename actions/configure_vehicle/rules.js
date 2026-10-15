'use strict';

const { TRIMS, GROUPS, RULES } = require('./catalog');

const DEFAULT_TRIM = 's-awd';

// Longer phrases first. Matching is on word boundaries so "red" does not
// fire inside "preferred", and a model can pass either an id or a label.
const ALIASES = {
  trim: [
    ['dynamic-se', ['dynamic se', 'dynamic-se']],
    ['s-awd', ['s awd', 's-awd']],
  ],
  paint: [
    ['arctic-white', ['arctic white', 'arctic-white', 'white']],
    ['slate-grey', ['slate grey', 'slate-grey', 'grey', 'gray']],
    ['obsidian-black', ['obsidian black', 'obsidian-black', 'obsidian']],
    ['crimson-red', ['crimson red', 'crimson-red', 'crimson']],
  ],
  wheels: [
    ['r22-black', ['22" gloss black', '22 inch', '22-inch', 'r22-black', 'r22']],
    ['r21-satin', ['21" satin', '21 inch', '21-inch', 'r21-satin', 'r21']],
    ['r20-gloss', ['20" gloss', '20 inch', '20-inch', 'gloss silver', 'r20-gloss', 'r20']],
  ],
  pack: [
    ['cold-climate', ['cold climate', 'cold-climate', 'winter pack']],
    ['black-exterior', ['black exterior', 'black-exterior']],
    ['none', ['no pack']],
  ],
  roof: [
    ['panoramic', ['panoramic', 'glass roof']],
    ['fixed', ['fixed roof', 'standard roof']],
  ],
};

function groupById(id) {
  return GROUPS.find((g) => g.id === id);
}

function hasPhrase(hay, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i').test(hay);
}

function canon(groupId, value) {
  if (value == null || value === '') return undefined;
  if (groupId === 'trim' && TRIMS[value]) return value;
  const group = groupById(groupId);
  if (group && group.options.some((option) => option.id === value)) return value;
  const table = ALIASES[groupId] || [];
  for (const [id, names] of table) {
    if (names.some((name) => hasPhrase(String(value), name))) return id;
  }
  return undefined;
}

function fromText(text) {
  const found = {};
  for (const groupId of Object.keys(ALIASES)) {
    for (const [id, names] of ALIASES[groupId]) {
      if (names.some((name) => hasPhrase(text, name))) {
        found[groupId] = id;
        break;
      }
    }
  }
  return found;
}

function normalize(args) {
  const text = ['userIntent', 'request', 'query', 'trim', 'paint', 'wheels', 'pack', 'roof']
    .map((key) => args[key])
    .filter((value) => typeof value === 'string')
    .join('\n');
  const hinted = fromText(text);
  const trim = canon('trim', args.trim) || hinted.trim || DEFAULT_TRIM;
  const sel = { trim };
  for (const group of GROUPS) {
    sel[group.id] = canon(group.id, args[group.id]) || hinted[group.id] || group.default;
  }
  return sel;
}

function firstBroken(sel) {
  return RULES.find((r) => r.when(sel)) || null;
}

// Roll back whichever group the broken rule points at, repeatedly, until the
// selection is internally consistent. Returns the rules that fired so the widget
// and the model can both explain what happened.
function reconcile(sel) {
  const dropped = [];
  let guard = 0;
  let broken = firstBroken(sel);
  while (broken && guard < GROUPS.length + 1) {
    const g = groupById(broken.blocks);
    dropped.push({
      rule: broken.id,
      group: g.id,
      removed: sel[g.id],
      revertedTo: g.default,
      reason: broken.reason,
    });
    sel[g.id] = g.default;
    broken = firstBroken(sel);
    guard += 1;
  }
  return dropped;
}

// For every option in every group, ask: would picking this, with everything else
// held constant, break a rule? That answer is what greys out a swatch in the UI.
function availability(sel) {
  return GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    selected: sel[g.id],
    options: g.options.map((o) => {
      const candidate = { ...sel, [g.id]: o.id };
      const broken = firstBroken(candidate);
      return {
        id: o.id,
        label: o.label,
        delta: o.delta,
        ...(o.swatch ? { swatch: o.swatch } : {}),
        available: !broken,
        ...(broken ? { reason: broken.reason } : {}),
      };
    }),
  }));
}

function quote(sel) {
  const base = TRIMS[sel.trim].base;
  const lines = [];
  let options = 0;
  for (const g of GROUPS) {
    const o = g.options.find((x) => x.id === sel[g.id]);
    if (o.delta > 0) {
      lines.push({ group: g.id, label: o.label, amount: o.delta });
      options += o.delta;
    }
  }
  return {
    currency: 'INR',
    base,
    options,
    total: base + options,
    lines,
    disclaimer: 'Ex-showroom Delhi. Registration, insurance and taxes extra.',
  };
}

function buildId(sel) {
  const key = `${sel.trim}|${sel.paint}|${sel.wheels}|${sel.pack}|${sel.roof}`;
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return `b_${Math.abs(h).toString(36)}`;
}

function configure(args = {}) {
  const selections = normalize(args);
  const dropped = reconcile(selections);
  return {
    selections,
    trimLabel: require('./catalog').TRIMS[selections.trim].label,
    dropped,
    groups: availability(selections),
    price: quote(selections),
    buildId: buildId(selections),
  };
}

module.exports = { configure };
