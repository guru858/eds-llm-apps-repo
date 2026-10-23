const DATA = Array.from(require('./data.json'))

const PARAMS = [
    { name: 'monthly_words', type: 'integer', required: false },
    { name: 'input_output_mix', type: 'string', required: false },
]

// action.params_binding is empty: no param filters records. Both params are
// context only, so every valid call returns every record in source order.
const BINDING = {}

function typeOk (type, value) {
    if (type === 'integer') return typeof value === 'number' && Number.isInteger(value)
    if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
    if (type === 'string') return typeof value === 'string'
    if (type === 'boolean') return typeof value === 'boolean'
    return true
}

function result (text, known, records) {
    return {
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records },
    }
}

module.exports = async (args = {}) => {
    const input = args && typeof args === 'object' ? args : {}
    const known = {}
    for (const p of PARAMS) {
        if (Object.prototype.hasOwnProperty.call(input, p.name) && input[p.name] !== undefined) {
            known[p.name] = input[p.name]
        }
    }

    for (const p of PARAMS) {
        if (!(p.name in known)) {
            if (p.required) return result(`Missing required parameter: ${p.name}.`, known, [])
            continue
        }
        if (known[p.name] !== null && !typeOk(p.type, known[p.name])) {
            return result(`Invalid parameter ${p.name}: expected ${p.type}.`, known, [])
        }
    }

    const records = DATA.filter(() => Object.keys(BINDING).length === 0)
    const n = records.length
    const text = n === 0
        ? 'No AI models matched this workload.'
        : `Found ${n} AI model${n === 1 ? '' : 's'} for this workload estimate.`
    return result(text, known, records)
}
