const DATA = Array.from(require('./data.json'))

// action.params: query (string, optional). params_binding is empty, so query is
// context only and never filters records.
const PARAMS = [{ name: 'query', type: 'string', required: false }]

function typeOk (value, type) {
    if (type === 'string') return typeof value === 'string'
    if (type === 'number' || type === 'integer') return typeof value === 'number' && Number.isFinite(value)
    if (type === 'boolean') return typeof value === 'boolean'
    if (type === 'array') return Array.isArray(value)
    return true
}

module.exports = async (args = {}) => {
    const input = args && typeof args === 'object' && !Array.isArray(args) ? args : {}
    const known = {}
    for (const p of PARAMS) {
        if (Object.prototype.hasOwnProperty.call(input, p.name) && input[p.name] !== undefined) {
            known[p.name] = input[p.name]
        }
    }

    for (const p of PARAMS) {
        const present = Object.prototype.hasOwnProperty.call(known, p.name) && known[p.name] !== null
        if (p.required && !present) {
            return {
                content: [{ type: 'text', text: `Missing required parameter: ${p.name}.` }],
                structuredContent: { arguments: known, records: [] },
            }
        }
        if (present && !typeOk(known[p.name], p.type)) {
            return {
                content: [{ type: 'text', text: `Invalid parameter ${p.name}: expected ${p.type}.` }],
                structuredContent: { arguments: known, records: [] },
            }
        }
    }

    // No bound params: every record, in source order.
    const records = DATA.slice()

    return {
        content: [{ type: 'text', text: `Found ${records.length} AI model${records.length === 1 ? '' : 's'}.` }],
        structuredContent: { arguments: known, records },
    }
}
