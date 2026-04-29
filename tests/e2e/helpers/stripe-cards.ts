/**
 * Stripe test card constants.
 *
 * Stripe publishes a stable set of test PANs that simulate specific
 * outcomes in test mode. Using named constants keeps tests readable
 * and avoids duplicating magic numbers.
 *
 * Reference: https://docs.stripe.com/testing#cards
 */

export const STRIPE_TEST_CARDS = {
  /** Approves cleanly. Use for the happy-path checkout test. */
  visaSuccess: {
    number: '4242 4242 4242 4242',
    exp:    '12 / 34',
    cvc:    '123',
    zip:    '90210',
  },
  /** Authentication required (3D Secure). For auth-flow tests. */
  visaSCA: {
    number: '4000 0027 6000 3184',
    exp:    '12 / 34',
    cvc:    '123',
    zip:    '90210',
  },
  /** Generic decline. For failure-path tests. */
  visaDecline: {
    number: '4000 0000 0000 0002',
    exp:    '12 / 34',
    cvc:    '123',
    zip:    '90210',
  },
  /** Insufficient funds. */
  visaInsufficientFunds: {
    number: '4000 0000 0000 9995',
    exp:    '12 / 34',
    cvc:    '123',
    zip:    '90210',
  },
} as const
