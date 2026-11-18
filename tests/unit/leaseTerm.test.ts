import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LEASE_TERMS, leaseTermLabel, parseLeaseTerm } from '@/lib/leaseTerm'

test('the four lease terms and their labels', () => {
  assert.deepEqual(LEASE_TERMS.map(t => t.value), ['month_to_month', 'six_months', 'one_year', 'multi_year'])
  assert.deepEqual(LEASE_TERMS.map(t => t.label), ['Month-to-month', '6 months', '1 year', 'Multi-year'])
  assert.equal(leaseTermLabel('six_months'), '6 months')
  assert.equal(leaseTermLabel(null), null)
  assert.equal(leaseTermLabel('weekly'), null)
})

test('parseLeaseTerm keeps valid terms on rentals only', () => {
  assert.equal(parseLeaseTerm('month_to_month', 'lease'), 'month_to_month')
  assert.equal(parseLeaseTerm('one_year', 'space'), 'one_year')
  assert.equal(parseLeaseTerm('multi_year', 'both'), 'multi_year')
  assert.equal(parseLeaseTerm('one_year', 'sale'), null)
  assert.equal(parseLeaseTerm('', 'lease'), null)
  assert.equal(parseLeaseTerm(null, 'lease'), null)
  assert.equal(parseLeaseTerm('forever', 'lease'), null)
})
