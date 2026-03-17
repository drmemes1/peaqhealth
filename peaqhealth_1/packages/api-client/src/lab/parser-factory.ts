import type { LabParser } from '@peaq/types/lab-parser'
import { AzureLabParser } from './parsers/azure'

/**
 * Returns the configured lab parser.
 * Add new parsers here as env variables become available.
 */
export function getLabParser(): LabParser {
  if (process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY) {
    return new AzureLabParser()
  }
  throw new Error(
    'No lab parser configured. Set AZURE_DOCUMENT_INTELLIGENCE_KEY and AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT.'
  )
}
