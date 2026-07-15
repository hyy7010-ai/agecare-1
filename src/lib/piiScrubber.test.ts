import { describe, it, expect } from 'vitest';
import { scrubPII } from './piiScrubber';

const RESIDENT = 'Mary Chen';

describe('scrubPII', () => {
  it('redacts the resident full name and name parts', () => {
    const out = scrubPII('Mary Chen was calm today. Chen ate lunch.', RESIDENT);
    expect(out).not.toMatch(/Mary|Chen/);
    expect(out).toContain('[RESIDENT_REDACTED]');
  });

  it('redacts email addresses', () => {
    const out = scrubPII('Contact daughter at jane.doe+care@gmail.com', RESIDENT);
    expect(out).not.toContain('jane.doe+care@gmail.com');
    expect(out).toContain('[EMAIL_REDACTED]');
  });

  it('redacts Medicare numbers with and without spacing', () => {
    expect(scrubPII('Medicare 2123 45670 1', RESIDENT)).toContain('[MEDICARE_REDACTED]');
    expect(scrubPII('Medicare 2123456701', RESIDENT)).not.toContain('2123456701');
  });

  it('redacts MRN-style identifiers', () => {
    const out = scrubPII('MRN: AB12345 admitted today', RESIDENT);
    expect(out).not.toContain('AB12345');
    expect(out).toContain('[ID_REDACTED]');
  });

  it('redacts AU mobile numbers', () => {
    const out = scrubPII('Call son on 0412 345 678', RESIDENT);
    expect(out).not.toContain('0412 345 678');
    expect(out).toContain('[PHONE_REDACTED]');
  });

  it('redacts AU landline numbers', () => {
    const out = scrubPII('Home phone (03) 9123 4567', RESIDENT);
    expect(out).not.toContain('9123 4567');
    expect(out).toContain('[PHONE_REDACTED]');
  });

  it('redacts dates of birth', () => {
    expect(scrubPII('DOB: 12/03/1941', RESIDENT)).toContain('[DOB_REDACTED]');
    expect(scrubPII('Born 12-03-1941 in Shanghai', RESIDENT)).toContain('[DOB_REDACTED]');
  });

  it('redacts street addresses', () => {
    const out = scrubPII('Previously lived at 42 Wattle Street before admission', RESIDENT);
    expect(out).not.toContain('42 Wattle Street');
    expect(out).toContain('[ADDRESS_REDACTED]');
  });

  it('keeps clinical content intact', () => {
    const out = scrubPII('Resident refused dinner and reported knee pain 6/10.', RESIDENT);
    expect(out).toContain('refused dinner');
    expect(out).toContain('knee pain');
  });

  it('handles empty input safely', () => {
    expect(scrubPII('', RESIDENT)).toBe('');
  });
});
