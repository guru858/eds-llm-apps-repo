const test = require('node:test')
const assert = require('node:assert/strict')
const handler = require('../actions/explain-ai-term/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/explain-ai-term.json')
const fixture = require('../fixture.json')

test('example arguments reproduce eds/explain-ai-term.json (parity)', async () => {
    const res = await handler(example.arguments)
    assert.deepEqual(res.structuredContent, expected)
    assert.deepEqual(res.structuredContent.records.map((r) => r.id), example.record_ids)
})

test('content[0] is a text item', async () => {
    const res = await handler({})
    assert.equal(res.content[0].type, 'text')
    assert.equal(typeof res.content[0].text, 'string')
    assert.deepEqual(Object.keys(res.content[0]).sort(), ['text', 'type'])
})

test('no required params: calling with no args returns all records', async () => {
    assert.equal(fixture.action.params.length, 0)
    const res = await handler()
    assert.deepEqual(res.structuredContent.records, fixture.dataset.records)
})

test('unknown keys are dropped and never filter', async () => {
    const res = await handler({ term: 'nothing-matches-this', foo: 1 })
    assert.deepEqual(res.structuredContent.arguments, {})
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
    assert.deepEqual(res.structuredContent.records, fixture.dataset.records)
})

test('records are whole DATA objects in source order with exact top-level keys', async () => {
    const res = await handler({})
    assert.deepEqual(Object.keys(res.structuredContent).sort(), ['arguments', 'records'])
    assert.ok(!('compare_options' in res.structuredContent))
    res.structuredContent.records.forEach((r, i) => assert.deepEqual(r, fixture.dataset.records[i]))
})

test('content text is one short count sentence and lists no records', async () => {
    const res = await handler({})
    const text = res.content[0].text
    assert.match(text, /^Found \d+ AI glossary terms?\.$/)
    for (const r of fixture.dataset.records) assert.ok(!text.includes(r.name))
})
