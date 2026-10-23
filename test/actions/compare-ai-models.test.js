const test = require('node:test')
const assert = require('node:assert/strict')

const handler = require('../actions/compare-ai-models/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/compare-ai-models.json')
const fixture = require('../fixture.json')
const DATA = require('../actions/compare-ai-models/data.json')

test('parity: example arguments return eds/compare-ai-models.json', async () => {
    const res = await handler(example.arguments)
    assert.deepEqual(res.structuredContent, expected)
    assert.deepEqual(res.structuredContent.records.map((r) => r.id), example.record_ids)
})

test('content[0] is a single text item', async () => {
    const res = await handler(example.arguments)
    assert.equal(res.content.length, 1)
    assert.equal(res.content[0].type, 'text')
    assert.equal(typeof res.content[0].text, 'string')
    assert.deepEqual(Object.keys(res.content[0]).sort(), ['text', 'type'])
})

test('action declares no params and no bindings', () => {
    assert.deepEqual(fixture.action.params, [])
    assert.deepEqual(fixture.action.params_binding, {})
})

test('no required params: a call with no arguments succeeds with all records', async () => {
    const res = await handler()
    assert.deepEqual(res.structuredContent, { arguments: {}, records: DATA })
})

test('unknown arguments are dropped and never filter; keys match the example', async () => {
    const res = await handler({ model: 'does-not-exist', id: 'zzz' })
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
    assert.deepEqual(res.structuredContent.arguments, {})
    assert.deepEqual(res.structuredContent.records, DATA)
})

test('records are whole DATA objects in source order', async () => {
    const res = await handler({})
    res.structuredContent.records.forEach((r, i) => assert.equal(r, DATA[i]))
})

test('no compare_options key since eds/example.json sets no compare_field', async () => {
    assert.equal(example.compare_field, undefined)
    const res = await handler({})
    assert.equal('compare_options' in res.structuredContent, false)
})

test('non-object arguments are tolerated', async () => {
    const res = await handler(null)
    assert.deepEqual(res.structuredContent, { arguments: {}, records: DATA })
})
