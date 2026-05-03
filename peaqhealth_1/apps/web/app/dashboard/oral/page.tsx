import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import { Nav } from "../../components/nav"
import { loadOralPageData } from "../../../lib/oral/v3/page-data"
import { OralPageHero } from "../../components/oral/v3/OralPageHero"
import { SnapshotSection } from "../../components/oral/v3/SnapshotSection"
import { CariesSection } from "../../components/oral/v3/CariesSection"
import { NRSection } from "../../components/oral/v3/NRSection"
import { PerioBurdenSection } from "../../components/oral/v3/PerioBurdenSection"
import { UpperAirwaySection } from "../../components/oral/v3/UpperAirwaySection"
import { HalitosisSection } from "../../components/oral/v3/HalitosisSection"
import { ComingSoonPlaceholder } from "../../components/oral/v3/ComingSoonPlaceholder"
import { TrajectorySection } from "../../components/oral/v3/TrajectorySection"
import { ActionsSection } from "../../components/oral/v3/ActionsSection"
import { CompositionDrawer } from "../../components/oral/v3/CompositionDrawer"
import { MethodologyDrawer } from "../../components/oral/v3/MethodologyDrawer"
import { ReferencesDrawer } from "../../components/oral/v3/ReferencesDrawer"
import { Divider } from "../../components/oral/v3/Divider"

const SANS = "var(--font-body)"
const SERIF = "var(--font-display)"

export default async function OralPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const result = await loadOralPageData(user.id)

  return (
    <div className="min-h-svh" style={{ background: "var(--off-white)" }}>
      <Nav />
      <main
        style={{
          maxWidth: 920,
          margin: "0 auto",
          padding: "48px 28px 120px",
        }}
      >
        {result.state === "no_kit" && (
          <div>
            <h1
              style={{
                fontFamily: SERIF,
                fontSize: 48,
                fontWeight: 700,
                color: "var(--ink)",
                margin: "0 0 16px",
                letterSpacing: "-0.03em",
              }}
            >
              A look at your mouth.
            </h1>
            <p
              style={{
                fontFamily: SANS,
                fontSize: 16,
                color: "var(--ink-80)",
                margin: "0 0 16px",
                lineHeight: 1.6,
                maxWidth: 600,
              }}
            >
              Your oral microbiome kit hasn&apos;t been processed yet. Once your sample is
              sequenced (typically 10–14 days from receipt), this page will show your community
              snapshot, caries balance, and nitric oxide pathway.
            </p>
            <Link
              href="/dashboard"
              style={{
                fontFamily: SANS,
                fontSize: 13,
                color: "var(--gold)",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textDecoration: "none",
              }}
            >
              ← Back to dashboard
            </Link>
          </div>
        )}

        {result.state === "processing" && (
          <div>
            <h1
              style={{
                fontFamily: SERIF,
                fontSize: 48,
                fontWeight: 700,
                color: "var(--ink)",
                margin: "0 0 16px",
                letterSpacing: "-0.03em",
              }}
            >
              Processing your sample
            </h1>
            <p
              style={{
                fontFamily: SANS,
                fontSize: 16,
                color: "var(--ink-80)",
                lineHeight: 1.6,
                maxWidth: 600,
              }}
            >
              Your kit is in the lab. Results typically post 10–14 days from receipt. We&apos;ll
              email you when this page is ready.
            </p>
          </div>
        )}

        {result.state === "ready" && (
          <>
            <OralPageHero data={result.data} />
            <Divider />
            <SnapshotSection data={result.data} />
            <Divider />
            <CariesSection data={result.data} />
            <Divider />
            <NRSection data={result.data} />
            <Divider />
            <PerioBurdenSection data={result.data} />
            <Divider />
            <UpperAirwaySection data={result.data} />
            <Divider />
            <HalitosisSection data={result.data} />
            <Divider />
            <ComingSoonPlaceholder
              title="Biofilm maturity"
              description="Early-colonizer vs late-colonizer ratio indicating biofilm developmental stage."
            />
            {!result.data.has_blood_data && (
              <ComingSoonPlaceholder
                title="Cross-panel synthesis"
                description="Connections between your oral microbiome, blood biomarkers, and questionnaire responses."
              />
            )}
            {!result.data.has_sleep_data && (
              <ComingSoonPlaceholder
                title="Sleep × oral signal chains"
                description="How sleep architecture and breathing patterns shape your oral environment."
              />
            )}
            <Divider />
            <TrajectorySection data={result.data} />
            <Divider />
            <ActionsSection data={result.data} />
            <Divider />
            <div style={{ marginTop: 12 }}>
              <CompositionDrawer topSpecies={result.data.top_species} />
              <MethodologyDrawer />
              <ReferencesDrawer />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
