// First-layer heuristic PII redaction that runs on-device before any text
// leaves the browser. Regex scrubbing is a defence-in-depth measure only;
// it is NOT a complete privacy-compliance solution (APP / consent framework
// requirements are handled at the organisational level).
export function scrubPII(text: string, residentName: string): string {
  if (!text) return text;

  let scrubbed = text;

  // 1. Scrub resident name (case insensitive)
  if (residentName) {
    const fullNameRegex = new RegExp(residentName, 'gi');
    scrubbed = scrubbed.replace(fullNameRegex, '[RESIDENT_REDACTED]');

    residentName.split(' ').forEach(part => {
      if (part.length > 2) {
        const partRegex = new RegExp(`\\b${part}\\b`, 'gi');
        scrubbed = scrubbed.replace(partRegex, '[RESIDENT_REDACTED]');
      }
    });
  }

  // 2. Email addresses
  scrubbed = scrubbed.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[EMAIL_REDACTED]');

  // 3. Medicare numbers (10 digits, optionally spaced 4-5-1, optional IRN suffix)
  scrubbed = scrubbed.replace(/\b\d{4}[ -]?\d{5}[ -]?\d(?:[ -]?\d)?\b/g, '[MEDICARE_REDACTED]');

  // 4. Other long numeric identifiers (MRN, resident IDs, 6+ digits)
  scrubbed = scrubbed.replace(/\b(?:MRN|URN|ID)[:\s#-]*\w{4,}\b/gi, '[ID_REDACTED]');
  scrubbed = scrubbed.replace(/\b\d{6,10}\b/g, '[ID_REDACTED]');

  // 5. Phone numbers: AU mobiles (04xx xxx xxx) and landlines ((0x) xxxx xxxx)
  scrubbed = scrubbed.replace(/\b(?:\+?61[ -]?)?0?4\d{2}[ -]?\d{3}[ -]?\d{3}\b/g, '[PHONE_REDACTED]');
  scrubbed = scrubbed.replace(/\(?0[2378]\)?[ -]?\d{4}[ -]?\d{4}\b/g, '[PHONE_REDACTED]');

  // 6. Dates of birth (dd/mm/yyyy, dd-mm-yyyy, or "DOB: ...")
  scrubbed = scrubbed.replace(/\b(?:DOB|date of birth)[:\s]*[\d/.-]+\b/gi, '[DOB_REDACTED]');
  scrubbed = scrubbed.replace(/\b\d{1,2}[/-]\d{1,2}[/-](?:19|20)\d{2}\b/g, '[DOB_REDACTED]');

  // 7. Street addresses (number + street name + common suffix)
  scrubbed = scrubbed.replace(
    /\b\d+[A-Za-z]?\s+[A-Za-z' ]+\s(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl|Crescent|Cres|Lane|Ln|Parade|Pde|Boulevard|Blvd)\b\.?/gi,
    '[ADDRESS_REDACTED]'
  );

  return scrubbed;
}
