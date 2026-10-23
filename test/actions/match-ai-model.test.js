const test = require('node:test')
const assert = require('node:assert/strict')

const handler = require('../actions/match-ai-model/index.js')
const example = require('../eds/example.json')
const expected = require('../eds/match-ai-model.json')
const fixture = require('../fixture.json')

const DATA = fixture.dataset.records

test('example arguments return the canonical tool result (parity)', async () => {
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

test('no required params: an empty call returns every record in source order', async () => {
    const res = await handler({})
    assert.deepEqual(res.structuredContent, { arguments: {}, records: DATA })
})

test('unbound params are context only and never filter', async () => {
    for (const name of ['audience', 'use_cases', 'budget', 'deployment_needs']) {
        const res = await handler({ [name]: 'zzz-no-such-value' })
        assert.deepEqual(res.structuredContent.arguments, { [name]: 'zzz-no-such-value' })
        assert.deepEqual(res.structuredContent.records, DATA)
    }
})

test('unknown keys are dropped from arguments', async () => {
    const res = await handler({ audience: 'corporate', bogus: 1 })
    assert.deepEqual(res.structuredContent.arguments, { audience: 'corporate' })
})

test('a wrongly typed param returns records [] naming the param, with the same keys', async () => {
    const res = await handler({ budget: 42 })
    assert.deepEqual(res.structuredContent.records, [])
    assert.match(res.content[0].text, /budget/)
    assert.deepEqual(Object.keys(res.structuredContent).sort(), Object.keys(expected).sort())
})

test('records are whole DATA objects and no compare_options key is added', async () => {
    const res = await handler(example.arguments)
    assert.equal('compare_options' in res.structuredContent, false)
    res.structuredContent.records.forEach((r, i) => assert.deepEqual(r, DATA[i]))
})
