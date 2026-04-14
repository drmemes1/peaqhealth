# Connection Line Pattern

Every page that displays a health marker, bacterial classification, or sleep metric MUST include a connection line evaluation.

## Standard implementation (copy this pattern):

```tsx
import { evaluateConnection } from '@peaq/score-engine'
import { ConnectionLineCard } from '@/app/components/connection-line'
import { buildConnectionInput } from '@/lib/score/buildConnectionInput'

// 1. Build input once at component top (server-side in page.tsx)
const connectionInput = buildConnectionInput({
  age, sex, lab, oral, sleepNights, lifestyle, snapshot,
})

// 2. Pass to client component as prop
<PanelClient connectionInput={connectionInput} />

// 3. In client component, evaluate for each marker
<ConnectionLineCard connection={evaluateConnection('marker_id', connectionInput)} />

// If fires = false, component returns null automatically.
// No conditional needed in the parent.
```

## Marker IDs (full list):

**Blood:** ldl, hs_crp, hba1c, glucose, lpa, vitamin_d, pheno_age, cholesterol, inflammation, blood_sugar, heart_health, vitamin_levels, cellular_health

**Sleep:** deep_sleep, rem, duration, recovery_hrv, consistency

**Oral:** good_bacteria, harmful_bacteria, cavity_risk, breath_health, diversity, inflammation_risk

## Pages where this pattern applies now:
- /dashboard/blood (blood-panel-client.tsx)
- /dashboard/sleep (sleep-panel-client.tsx)
- /dashboard/oral (oral-panel-client.tsx)

## Pages where this pattern will apply when built:
- /dashboard/blood/[marker] (individual marker pages)
- /dashboard/sleep/[metric] (individual metric pages)
- /dashboard/oral/[classification] (individual pages)
- /trends (when individual metric trend pages exist)
- Any future biomarker page added to the platform

## Adding new rules:
1. Add the rule to docs/INSIGHTS.md
2. Add the rule function to packages/score-engine/src/connections.ts
3. Add the marker_id to the MARKER_RULES map
4. Add a unit test to connections.test.ts
5. No changes needed to any page — evaluateConnection() picks it up automatically
