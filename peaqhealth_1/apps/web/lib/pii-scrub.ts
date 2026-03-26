// HIPAA: Strip PII from raw PDF text before
// sending to Azure OpenAI. Only biomarker values,
// units, and reference ranges are needed for parsing.

export function stripPII(text: string): string {
  let out = text

  // 1. Patient name lines
  out = out.replace(/^(patient\s*name|name)\s*:.*$/gim, (_, label) => `${label}: [REDACTED]`)

  // 2. Date of birth
  out = out.replace(/(dob|date of birth|birthdate)\s*:.*$/gim, (_, label) => `${label}: [REDACTED]`)

  // 3. Social Security Number — bare pattern first, then labeled
  out = out.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED]")
  out = out.replace(/\bSSN\s*:.*$/gim, "SSN: [REDACTED]")

  // 4. Medical Record Number / Patient ID
  out = out.replace(/(mrn|medical record|patient id|patient #)\s*:.*$/gim, (_, label) => `${label}: [REDACTED]`)

  // 5. Street addresses
  out = out.replace(
    /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|blvd|boulevard|drive|dr|lane|ln)\b.*$/gim,
    "[ADDRESS REDACTED]"
  )

  // 6. Phone numbers
  out = out.replace(/(\+?1?\s?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g, "[PHONE REDACTED]")

  // 7. Email addresses
  out = out.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL REDACTED]")

  return out
}
