import type { ParsedMarker } from '@peaq/types/lab-parser'
import type { BloodInputs } from '@peaq/types'

/**
 * Maps ParsedMarker[] → Partial<BloodInputs> for the score engine.
 * Only maps keys that exist in BloodInputs; extra markers are silently ignored.
 */
export function mapParsedMarkersToBloodInputs(
  markers: ParsedMarker[]
): Partial<BloodInputs> {
  const inputs: Partial<BloodInputs> = {}

  for (const marker of markers) {
    switch (marker.canonicalKey) {
      case 'hsCRP_mgL':           inputs.hsCRP_mgL           = marker.value; break
      case 'vitaminD_ngmL':       inputs.vitaminD_ngmL       = marker.value; break
      case 'apoB_mgdL':           inputs.apoB_mgdL           = marker.value; break
      case 'ldl_mgdL':            inputs.ldl_mgdL            = marker.value; break
      case 'hdl_mgdL':            inputs.hdl_mgdL            = marker.value; break
      case 'triglycerides_mgdL':  inputs.triglycerides_mgdL  = marker.value; break
      case 'lpa_mgdL':            inputs.lpa_mgdL            = marker.value; break
      case 'glucose_mgdL':        inputs.glucose_mgdL        = marker.value; break
      case 'hba1c_pct':           inputs.hba1c_pct           = marker.value; break
      case 'esr_mmhr':            inputs.esr_mmhr            = marker.value; break
      case 'homocysteine_umolL':  inputs.homocysteine_umolL  = marker.value; break
      case 'ferritin_ngmL':       inputs.ferritin_ngmL       = marker.value; break
    }
  }

  return inputs
}
