import { initialValues, toRequest, validate, type SubscriptionFormValues } from '@/lib/subscription-form';
import { subscription } from '@/test/fixtures';

const filled = (overrides: Partial<SubscriptionFormValues> = {}): SubscriptionFormValues => ({
  ...initialValues(undefined, 'USD'),
  name: 'Spotify',
  amount: '5.99',
  ...overrides,
});

describe('initialValues', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 4, 15, 30));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts a new subscription today, monthly, active, in the user currency, with a 3-day reminder', () => {
    expect(initialValues(undefined, 'JOD')).toMatchObject({
      name: '',
      amount: '',
      currency: 'JOD',
      billingCycle: 'MONTHLY',
      firstBillingDate: '2026-10-04',
      status: 'ACTIVE',
      reminderDaysBefore: 3,
    });
  });

  it('starts an edit from the saved values', () => {
    const existing = subscription({ name: 'JetBrains', amount: 149, currency: 'EUR', billingCycle: 'YEARLY', notes: 'Student licence' });

    expect(initialValues(existing, 'USD')).toMatchObject({
      name: 'JetBrains',
      amount: '149',
      currency: 'EUR',
      billingCycle: 'YEARLY',
      firstBillingDate: '2026-01-15',
      notes: 'Student licence',
      websiteUrl: '',
    });
  });

  it('keeps "no reminder" on an existing subscription instead of applying the default', () => {
    expect(initialValues(subscription({ reminderDaysBefore: null }), 'USD').reminderDaysBefore).toBeNull();
  });
});

describe('validate', () => {
  it('accepts a filled-in form', () => {
    expect(validate(filled())).toEqual({});
    expect(validate(filled({ amount: '0' }))).toEqual({});
    expect(validate(filled({ websiteUrl: 'https://spotify.com' }))).toEqual({});
  });

  it('asks for a name and a price', () => {
    expect(validate(filled({ name: '   ', amount: '' }))).toEqual({ name: 'Enter a name', amount: 'Enter a price' });
  });

  it.each(['4.999', '-5', 'abc', '1.2.3', '12345678901'])('rejects the price %s', (amount) => {
    expect(validate(filled({ amount }))).toEqual({ amount: 'Use a number like 9.99' });
  });

  it('accepts a comma as the decimal separator', () => {
    expect(validate(filled({ amount: '5,99' }))).toEqual({});
  });

  it.each(['spotify.com', 'ftp://spotify.com', 'javascript:alert(1)'])('rejects the website %s', (websiteUrl) => {
    expect(validate(filled({ websiteUrl }))).toEqual({ websiteUrl: 'Must start with http:// or https://' });
  });
});

describe('toRequest', () => {
  it('sends the price as a number and trims the text fields', () => {
    const request = toRequest(filled({ name: '  Spotify ', amount: ' 5,99 ', notes: ' family plan ', websiteUrl: ' https://spotify.com ' }));

    expect(request).toMatchObject({ name: 'Spotify', amount: 5.99, notes: 'family plan', websiteUrl: 'https://spotify.com' });
  });

  it('sends "no reminder" as null', () => {
    expect(toRequest(filled({ reminderDaysBefore: null })).reminderDaysBefore).toBeNull();
  });
});
