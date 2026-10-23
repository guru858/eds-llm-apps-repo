const DATA = Array.from(require('./data.json'))

// action.params is empty and action.params_binding is empty: every call
// returns every record in source order. Unknown argument keys are dropped.
const PARAMS = []

module.exports = async (args = {}) => {
    const input = args && typeof args === 'object' ? args : {}
    const known = {}
    for (const p of PARAMS) {
        if (Object.prototype.hasOwnProperty.call(input, p.name)) known[p.name] = input[p.name]
    }
    const records = DATA.slice()
    const text = records.length === 0
        ? 'No AI models found.'
        : `Found ${records.length} AI model${records.length === 1 ? '' : 's'}.`
    return {
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records },
    }
}
