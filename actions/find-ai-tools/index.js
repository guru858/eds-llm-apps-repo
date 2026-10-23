const DATA = Array.from(require('./data.json'))

const PARAMS = [
    { name: 'query', type: 'string', required: false },
]

// params_binding is empty: every param is context only and never filters.
const BINDING = {}

function typeOk(value, type) {
    if (type === 'string') return typeof value === 'string'
    if (type === 'number' || type === 'integer') return typeof value === 'number' && Number.isFinite(value)
    if (type === 'boolean') return typeof value === 'boolean'
    if (type === 'array') return Array.isArray(value)
    return true
}

function parseNumber(value) {
    if (typeof value === 'number') return value
    if (typeof value !== 'string') return NaN
    let s = value.replace(/[^0-9.,-]/g, '')
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
    return s === '' ? NaN : Number(s)
}

function scalarMatches(fieldValue, arg) {
    if (fieldValue === null || fieldValue === undefined) return false
    if (typeof arg === 'number') {
        const n = parseNumber(fieldValue)
        return !Number.isNaN(n) && n === arg
    }
    if (typeof arg === 'string') {
        const f = String(fieldValue).trim().toLowerCase()
        const whole = arg.trim().toLowerCase()
        if (f === whole) return true
        return arg.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).some((item) => item === f)
    }
    return fieldValue === arg
}

function fieldMatches(fieldValue, arg) {
    if (Array.isArray(fieldValue)) return fieldValue.some((item) => scalarMatches(item, arg))
    return scalarMatches(fieldValue, arg)
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
        const present = Object.prototype.hasOwnProperty.call(known, p.name) && known[p.name] !== null
        if (p.required && !present) {
            return {
                content: [{ type: 'text', text: `Missing required parameter: ${p.name}.` }],
                structuredContent: { arguments: known, records: [] },
            }
        }
        if (present && !typeOk(known[p.name], p.type)) {
            return {
                content: [{ type: 'text', text: `Parameter ${p.name} must be a ${p.type}.` }],
                structuredContent: { arguments: known, records: [] },
            }
        }
    }

    let records = DATA
    for (const [param, field] of Object.entries(BINDING)) {
        if (!Object.prototype.hasOwnProperty.call(known, param) || known[param] === null || known[param] === '') continue
        records = records.filter((r) => r && fieldMatches(r[field], known[param]))
    }

    const n = records.length
    const text = n === 0
        ? 'No AI tools matched this request.'
        : `Found ${n} AI tool${n === 1 ? '' : 's'} in the directory.`
    return {
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records },
    }
}
