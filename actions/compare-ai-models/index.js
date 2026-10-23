const DATA = Array.from(require('./data.json'))

// action.params is empty and action.params_binding is empty: no argument
// filters records, so every call returns every record in source order.
const PARAMS = []
const BINDING = {}

function pickKnown(args) {
    const known = {}
    if (!args || typeof args !== 'object' || Array.isArray(args)) return known
    for (const p of PARAMS) {
        if (Object.prototype.hasOwnProperty.call(args, p.name)) known[p.name] = args[p.name]
    }
    return known
}

function validate(known) {
    for (const p of PARAMS) {
        const v = known[p.name]
        if (p.required && (v === undefined || v === null || v === '')) return `Missing required parameter: ${p.name}.`
        if (v !== undefined && v !== null && p.type && p.type !== 'any') {
            const t = p.type === 'integer' ? 'number' : p.type
            if (t === 'array' ? !Array.isArray(v) : typeof v !== t) return `Invalid type for parameter ${p.name}: expected ${p.type}.`
        }
    }
    return null
}

function toNumber(v) {
    if (typeof v === 'number') return v
    if (typeof v !== 'string') return NaN
    let s = v.replace(/[^0-9.,-]/g, '')
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
    return s === '' ? NaN : Number(s)
}

function valueMatches(fieldValue, arg) {
    if (fieldValue === undefined || fieldValue === null) return false
    if (Array.isArray(fieldValue)) return fieldValue.some((item) => valueMatches(item, arg))
    if (typeof arg === 'number') return toNumber(fieldValue) === arg
    if (typeof arg === 'string') {
        const f = String(fieldValue).trim().toLowerCase()
        const whole = arg.trim().toLowerCase()
        if (f === whole) return true
        return arg.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).includes(f)
    }
    return fieldValue === arg
}

module.exports = async (args = {}) => {
    const known = pickKnown(args)
    const error = validate(known)
    if (error) {
        return {
            content: [{ type: 'text', text: error }],
            structuredContent: { arguments: known, records: [] },
        }
    }
    let records = DATA
    for (const [param, field] of Object.entries(BINDING)) {
        const arg = known[param]
        if (arg === undefined || arg === null || arg === '') continue
        records = records.filter((r) => r && valueMatches(r[field], arg))
    }
    const n = records.length
    const text = n === 0
        ? 'No AI models found to compare.'
        : `Comparing ${n} AI model${n === 1 ? '' : 's'} from LLMs Guru.`
    return {
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records },
    }
}
