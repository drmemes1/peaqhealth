"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import OraviLogo from "../../components/OraviLogo"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const INK = "#141410"
const PAPER = "#FAFAF8"
const BORDER = "rgba(20,20,16,0.12)"

export default function KitCollectPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: "100vh", background: PAPER, color: INK }}>
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 32px",
        borderBottom: `0.5px solid ${BORDER}`,
      }}>
        <OraviLogo size="sm" showTagline={false} />
        <Link
          href="/dashboard"
          style={{ fontFamily: sans, fontSize: 14, color: INK, textDecoration: "none", opacity: 0.6 }}
        >
          ← Dashboard
        </Link>
      </nav>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 style={{
          fontFamily: serif,
          fontSize: "clamp(32px, 5vw, 44px)",
          fontWeight: 400,
          lineHeight: 1.1,
          margin: "0 0 20px",
          letterSpacing: "-0.01em",
        }}>
          How to collect
        </h1>

        <p style={{
          fontFamily: sans,
          fontSize: 16,
          color: "#3D3B35",
          lineHeight: 1.65,
          margin: "0 0 28px",
        }}>
          Tilt your head slightly forward. Let saliva pool — don&rsquo;t swallow for about 30 seconds. Then let it drip gently into the tube for 1–2 minutes until you reach the fill line.
        </p>

        <div style={{
          background: "#FFFFFF",
          border: `0.5px solid ${BORDER}`,
          borderRadius: 3,
          padding: "16px 20px",
          marginBottom: 44,
        }}>
          <p style={{
            fontFamily: sans,
            fontSize: 14,
            color: INK,
            lineHeight: 1.5,
            margin: 0,
            fontWeight: 500,
          }}>
            Collect before brushing, eating, or rinsing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          style={{
            width: "100%",
            padding: "14px 24px",
            background: INK,
            color: "#fff",
            border: "none",
            borderRadius: 3,
            fontSize: 13,
            fontFamily: sans,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          I&rsquo;ve collected my sample →
        </button>
      </main>
    </div>
  )
}
