const test = require('node:test')
const assert = require('node:assert/strict')
const handler = require('../actions/estimate-ai-model-costs/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/estimate-ai-model-costs.json')
const fixture = require('../fixture.json')

const allIds = fixture.dataset.records.map((r) => r.id)

test('example arguments reproduce eds/estimate-ai-model-costs.json', async () => {
    const res = await handler(example.arguments)
    assert.deepEqual(res.structuredContent, expected)
})

test('content[0] is a text item', async () => {
    const res = await handler(example.arguments)
    assert.equal(res.content[0].type, 'text')
    assert.equal(typeof res.content[0].text, 'string')
    assert.deepEqual(Object.keys(res.content[0]).sort(), ['text', 'type'])
})

test('no required params: an empty call returns every record in source order', async () => {
    const res = await handler({})
    assert.deepEqual(res.structuredContent.arguments, {})
    assert.deepEqual(res.structuredContent.records.map((r) => r.id), allIds)
    const none = await handler()
    assert.deepEqual(none.structuredContent.records.map((r) => r.id), allIds)
})

test('unbound params are context only and never filter', async () => {
    const a = await handler({ monthly_words: 1 })
    assert.deepEqual(a.structuredContent.records.map((r) => r.id), allIds)
    const b = await handler({ input_output_mix: 'zzz-no-such-mix' })
    assert.deepEqual(b.structuredContent.records.map((r) => r.id), allIds)
    const c = await handler({ input_output_mix: 'Placeholder name 1,Placeholder name 2' })
    assert.deepEqual(c.structuredContent.records.map((r) => r.id), allIds)
})

test('records are whole objects from the dataset', async () => {
    const res = await handler(example.arguments)
    assert.deepEqual(res.structuredContent.records, fixture.dataset.records)
})

test('unknown keys are dropped from arguments', async () => {
    const res = await handler({ ...example.arguments, extra: 'x' })
    assert.deepEqual(res.structuredContent.arguments, example.arguments)
})

test('wrong type for monthly_words returns no records and names the param', async () => {
    for (const bad of ['2000000', 1.5]) {
        const res = await handler({ monthly_words: bad })
        assert.deepEqual(res.structuredContent.records, [])
        assert.match(res.content[0].text, /monthly_words/)
        assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
    }
})

test('wrong type for input_output_mix returns no records and names the param', async () => {
    const res = await handler({ input_output_mix: 70 })
    assert.deepEqual(res.structuredContent.records, [])
    assert.match(res.content[0].text, /input_output_mix/)
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
})

test('no compare_options key (example.json sets no compare_field)', async () => {
    assert.equal(example.compare_field, undefined)
    const res = await handler(example.arguments)
    assert.equal('compare_options' in res.structuredContent, false)
})

test('content never lists record names', async () => {
    const res = await handler(example.arguments)
    for (const r of fixture.dataset.records) assert.equal(res.content[0].text.includes(r.name), false)
})
