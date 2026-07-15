export function scrubPII(text: string, residentName: string): string {
  if (!text || !residentName) return text;
  
  // 1. Scrub resident name (case insensitive)
  const nameParts = residentName.split(' ');
  let scrubbed = text;
  
  // Replace full name
  const fullNameRegex = new RegExp(residentName, 'gi');
  scrubbed = scrubbed.replace(fullNameRegex, '[RESIDENT_REDACTED]');
  
  // Replace first/last names
  nameParts.forEach(part => {
    if (part.length > 2) {
      const partRegex = new RegExp(`\\b${part}\\b`, 'gi');
      scrubbed = scrubbed.replace(partRegex, '[RESIDENT_REDACTED]');
    }
  });

  // 2. Scrub potential Medicare numbers / IDs (e.g. 10 digits)
  const idRegex = /\b\d{10}\b/g;
  scrubbed = scrubbed.replace(idRegex, '[ID_REDACTED]');

  // 3. Scrub phone numbers (simple pattern)
  const phoneRegex = /\b04\d{8}\b/g;
  scrubbed = scrubbed.replace(phoneRegex, '[PHONE_REDACTED]');

  return scrubbed;
}
