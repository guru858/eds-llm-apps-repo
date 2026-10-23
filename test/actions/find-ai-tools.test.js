const test = require('node:test')
const assert = require('node:assert/strict')
const handler = require('../actions/find-ai-tools/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/find-ai-tools.json')
const DATA = require('../actions/find-ai-tools/data.json')

test('example arguments return the canonical tool result (parity)', async () => {
    const res = await handler(example.arguments)
    assert.deepEqual(res.structuredContent, expected)
    assert.deepEqual(res.structuredContent.records.map((r) => r.id), example.record_ids)
})

test('content[0] is a text item with a string', async () => {
    const res = await handler(example.arguments)
    assert.equal(res.content[0].type, 'text')
    assert.equal(typeof res.content[0].text, 'string')
    assert.deepEqual(Object.keys(res.content[0]).sort(), ['text', 'type'])
})

test('no required params: a call without arguments returns every record', async () => {
    const res = await handler()
    assert.deepEqual(res.structuredContent.records, DATA)
    assert.deepEqual(res.structuredContent.arguments, {})
})

test('unbound query is context only: kept in arguments, does not filter', async () => {
    const res = await handler({ query: 'no-such-tool-xyz' })
    assert.deepEqual(res.structuredContent.arguments, { query: 'no-such-tool-xyz' })
    assert.deepEqual(res.structuredContent.records, DATA)
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
})

test('comma-separated query still does not filter (unbound)', async () => {
    const res = await handler({ query: `${DATA[0].name},${DATA[1].name}` })
    assert.deepEqual(res.structuredContent.records, DATA)
})

test('unknown keys are dropped from arguments', async () => {
    const res = await handler({ query: 'writing', foo: 'bar' })
    assert.deepEqual(res.structuredContent.arguments, { query: 'writing' })
})

test('wrong type for query returns no records, names the param, same keys', async () => {
    const res = await handler({ query: 42 })
    assert.deepEqual(res.structuredContent.records, [])
    assert.match(res.content[0].text, /query/)
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
})

test('records are whole objects from the dataset and no compare_options key', async () => {
    const res = await handler({})
    res.structuredContent.records.forEach((r, i) => assert.deepEqual(r, DATA[i]))
    assert.equal('compare_options' in res.structuredContent, false)
})
