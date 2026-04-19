"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import CnvrgLogo from "../../components/CnvrgLogo"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const INK = "#141410"
const PAPER = "#FAFAF8"
const GREEN = "#1A8C4E"
const AMBER = "#B8860B"
const MUTED = "#9B9891"
const BORDER = "rgba(20,20,16,0.12)"

type Choice<T> = { value: T; label: string }

function Toggle<T extends string | boolean>({
  options,
  value,
  onChange,
  selectedColor,
}: {
  options: [Choice<T>, Choice<T>]
  value: T
  onChange: (v: T) => void
  selectedColor: (v: T) => string
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {options.map(opt => {
        const selected = opt.value === value
        const color = selected ? selectedColor(opt.value) : INK
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "14px 16px",
              background: selected ? `${color}14` : "#FFFFFF",
              border: `1.5px solid ${selected ? color : BORDER}`,
              borderRadius: 3,
              color: selected ? color : INK,
              fontFamily: sans,
              fontSize: 14,
              fontWeight: selected ? 600 : 500,
              letterSpacing: "0.04em",
              cursor: "pointer",
              transition: "background 0.12s, border-color 0.12s, color 0.12s",
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default function KitPreparePage() {
  const router = useRouter()
  const [dietaryNitrateToday, setDietaryNitrateToday] = useState<boolean>(false)
  const [preHygieneConfirmed, setPreHygieneConfirmed] = useState<boolean>(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit() {
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/kit/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dietary_nitrate_today: dietaryNitrateToday,
          pre_hygiene_confirmed: preHygieneConfirmed,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? "Something went wrong. Please try again.")
        setSaving(false)
        return
      }
      router.push("/kit/collect")
    } catch {
      setError("Network error. Please check your connection and try again.")
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: PAPER, color: INK }}>
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 32px",
        borderBottom: `0.5px solid ${BORDER}`,
      }}>
        <CnvrgLogo size="sm" showTagline={false} />
        <Link
          href="/dashboard"
          style={{ fontFamily: sans, fontSize: 14, color: INK, textDecoration: "none", opacity: 0.6 }}
        >
          ← Dashboard
        </Link>
      </nav>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "48px 24px 80px" }}>
        <p style={{
          fontFamily: sans, fontSize: 11, letterSpacing: "0.12em",
          textTransform: "uppercase", color: MUTED, margin: "0 0 16px",
        }}>
          Step 2 of 2
        </p>
        <h1 style={{
          fontFamily: serif,
          fontSize: "clamp(32px, 5vw, 44px)",
          fontWeight: 400,
          lineHeight: 1.1,
          margin: "0 0 10px",
          letterSpacing: "-0.01em",
        }}>
          Two quick things
        </h1>
        <p style={{
          fontFamily: sans,
          fontSize: 15,
          color: "#5C5A54",
          margin: "0 0 44px",
          lineHeight: 1.5,
        }}>
          Helps us read two specific bacteria accurately.
        </p>

        <section style={{ marginBottom: 32 }}>
          <p style={{
            fontFamily: sans, fontSize: 15, color: INK,
            margin: "0 0 14px", fontWeight: 500, lineHeight: 1.45,
          }}>
            Eaten arugula, beets, or spinach yesterday?
          </p>
          <Toggle<boolean>
            options={[
              { value: false, label: "No" },
              { value: true, label: "Yes" },
            ]}
            value={dietaryNitrateToday}
            onChange={setDietaryNitrateToday}
            selectedColor={v => (v ? AMBER : GREEN)}
          />
        </section>

        <section style={{ marginBottom: 40 }}>
          <p style={{
            fontFamily: sans, fontSize: 15, color: INK,
            margin: "0 0 14px", fontWeight: 500, lineHeight: 1.45,
          }}>
            Collected before brushing or eating?
          </p>
          <Toggle<boolean>
            options={[
              { value: true, label: "Yes" },
              { value: false, label: "No, I already did" },
            ]}
            value={preHygieneConfirmed}
            onChange={setPreHygieneConfirmed}
            selectedColor={v => (v ? GREEN : AMBER)}
          />
          {!preHygieneConfirmed && (
            <p style={{
              fontFamily: sans, fontSize: 13, color: "#5C5A54",
              lineHeight: 1.5, margin: "12px 2px 0",
            }}>
              No problem — just try to collect first next time for the cleanest result.
            </p>
          )}
        </section>

        {error && (
          <p style={{
            fontFamily: sans, fontSize: 13, color: "#c0392b",
            margin: "0 0 12px", lineHeight: 1.4,
          }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
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
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {saving ? "Saving…" : "Ready to collect →"}
        </button>
      </main>
    </div>
  )
}
