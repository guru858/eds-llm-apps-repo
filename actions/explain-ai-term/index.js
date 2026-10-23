const DATA = Array.from(require('./data.json'))

// action.params is empty and params_binding is empty: every call returns all
// records in source order. Unknown argument keys are dropped.
const PARAMS = []

module.exports = async (args = {}) => {
    const input = args && typeof args === 'object' && !Array.isArray(args) ? args : {}
    const known = {}
    for (const p of PARAMS) {
        if (Object.prototype.hasOwnProperty.call(input, p.name)) known[p.name] = input[p.name]
    }
    const records = DATA.slice()
    const n = records.length
    const text = n === 0
        ? 'No AI glossary terms found.'
        : `Found ${n} AI glossary term${n === 1 ? '' : 's'}.`
    return {
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records },
    }
}
