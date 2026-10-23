const test = require('node:test')
const assert = require('node:assert/strict')
const handler = require('../actions/view-ai-model/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/view-ai-model.json')
const data = require('../actions/view-ai-model/data.json')

test('example arguments reproduce eds/view-ai-model.json', async () => {
    const res = await handler(example.arguments)
    assert.deepEqual(res.structuredContent, expected)
})

test('content[0] is a text item', async () => {
    const res = await handler(example.arguments)
    assert.equal(res.content[0].type, 'text')
    assert.equal(typeof res.content[0].text, 'string')
    assert.deepEqual(Object.keys(res.content[0]).sort(), ['text', 'type'])
})

test('no params declared: no-arg call returns every record in source order', async () => {
    const res = await handler()
    assert.deepEqual(res.structuredContent.arguments, {})
    assert.deepEqual(res.structuredContent.records.map((r) => r.id), data.map((r) => r.id))
    assert.deepEqual(res.structuredContent.records, data)
})

test('unknown argument keys are dropped and never filter', async () => {
    const res = await handler({ model: 'nothing-matches', foo: 1 })
    assert.deepEqual(res.structuredContent.arguments, {})
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
    assert.equal(res.structuredContent.records.length, data.length)
})

test('structuredContent has only arguments and records (no compare_options)', async () => {
    const res = await handler({})
    assert.deepEqual(Object.keys(res.structuredContent).sort(), ['arguments', 'records'])
})
