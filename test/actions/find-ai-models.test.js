const test = require('node:test')
const assert = require('node:assert/strict')
const handler = require('../actions/find-ai-models/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/find-ai-models.json')
const fixture = require('../fixture.json')

const DATA = fixture.dataset.records

test('example arguments return the canonical tool result', async () => {
    const res = await handler(example.arguments)
    assert.deepEqual(res.structuredContent, expected)
    assert.deepEqual(res.structuredContent.records.map((r) => r.id), example.record_ids)
})

test('content[0] is a text item', async () => {
    const res = await handler(example.arguments)
    assert.equal(res.content[0].type, 'text')
    assert.equal(typeof res.content[0].text, 'string')
    assert.deepEqual(Object.keys(res.content[0]).sort(), ['text', 'type'])
})

test('no required params: an empty call succeeds with every record in source order', async () => {
    const res = await handler()
    assert.deepEqual(res.structuredContent.arguments, {})
    assert.deepEqual(res.structuredContent.records, DATA)
})

test('unbound query is context only and never filters', async () => {
    const res = await handler({ query: 'no-such-model-xyz' })
    assert.deepEqual(res.structuredContent.arguments, { query: 'no-such-model-xyz' })
    assert.deepEqual(res.structuredContent.records, DATA)
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
})

test('comma-separated query is passed through unchanged and does not filter', async () => {
    const q = `${DATA[0].name}, ${DATA[1].name}`
    const res = await handler({ query: q })
    assert.equal(res.structuredContent.arguments.query, q)
    assert.equal(res.structuredContent.records.length, DATA.length)
})

test('wrong type for query is rejected with the same keys and names the param', async () => {
    const res = await handler({ query: 42 })
    assert.deepEqual(res.structuredContent.records, [])
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
    assert.match(res.content[0].text, /query/)
})

test('unknown keys are dropped from arguments', async () => {
    const res = await handler({ query: 'gpt', foo: 'bar' })
    assert.deepEqual(res.structuredContent.arguments, { query: 'gpt' })
})

test('records are whole objects from the dataset and no compare_options key', async () => {
    const res = await handler({})
    assert.equal('compare_options' in res.structuredContent, false)
    for (const r of res.structuredContent.records) {
        assert.deepEqual(r, DATA.find((d) => d.id === r.id))
    }
})
