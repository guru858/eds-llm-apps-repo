const DATA = Array.from(require('./data.json'))

// action.params; params_binding is empty, so every param is context only.
const PARAMS = [
    { name: 'audience', type: 'string', required: false },
    { name: 'use_cases', type: 'string', required: false },
    { name: 'budget', type: 'string', required: false },
    { name: 'deployment_needs', type: 'string', required: false },
]
const BINDING = {}

function typeOk(type, value) {
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

function itemMatches(fieldValue, candidates) {
    if (fieldValue === null || fieldValue === undefined) return false
    if (Array.isArray(fieldValue)) return fieldValue.some((v) => itemMatches(v, candidates))
    return candidates.some((c) => {
        if (typeof c === 'number') return parseNumber(fieldValue) === c
        return String(fieldValue).trim().toLowerCase() === String(c).trim().toLowerCase()
    })
}

function recordMatches(record, field, value) {
    const fieldValue = record ? record[field] : undefined
    if (typeof value === 'string') {
        if (itemMatches(fieldValue, [value])) return true
        const parts = value.split(',').map((p) => p.trim()).filter(Boolean)
        return parts.length > 1 && itemMatches(fieldValue, parts)
    }
    return itemMatches(fieldValue, [value])
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
        if (present && !typeOk(p.type, known[p.name])) {
            return {
                content: [{ type: 'text', text: `Parameter ${p.name} must be a ${p.type}.` }],
                structuredContent: { arguments: known, records: [] },
            }
        }
    }

    let records = DATA
    for (const [param, field] of Object.entries(BINDING)) {
        if (known[param] === undefined || known[param] === null) continue
        records = records.filter((r) => recordMatches(r, field, known[param]))
    }

    const n = records.length
    const text = n === 0
        ? 'No AI models matched these answers.'
        : `Found ${n} AI model match${n === 1 ? '' : 'es'} for these answers.`
    return {
        content: [{ type: 'text', text }],
        structuredContent: { arguments: known, records },
    }
}
