"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import OraviLogo from "../../components/OraviLogo"
import { validateKitCode } from "../../../lib/kit-code"

type RegistrationStatus = "idle" | "loading" | "success" | "error"

const STATUS_STEPS = [
  { label: "Kit ordered", key: "ordered" },
  { label: "Registered", key: "registered" },
  { label: "Mailed", key: "mailed" },
  { label: "Results ready", key: "results_ready" },
]

function formatKitCodeInput(raw: string): string {
  // Strip everything non-alphanumeric, uppercase
  const clean = raw.replace(/[^A-Z0-9]/gi, "").toUpperCase()
  // Inject dashes at positions 4 (after ORAVI) and 8 (after 4-char segment)
  // Expected final: ORAVI-XXXX-XXXXX
  // We allow the user to type without the ORAVI prefix or with it
  // Strategy: always build from clean chars
  // If user typed ORAVI as first 4 chars treat them as the prefix
  let chars = clean
  // Remove leading ORAVI if present so we only work with variable segments
  if (chars.startsWith("ORAVI")) {
    chars = chars.slice(4)
  }
  // chars now contains up to 9 variable characters (seg1=4, seg2=5)
  const seg1 = chars.slice(0, 4)
  const seg2 = chars.slice(4, 9)

  if (seg1.length === 0) return "ORAVI-"
  if (seg1.length < 4) return `ORAVI-${seg1}`
  if (seg2.length === 0) return `ORAVI-${seg1}-`
  return `ORAVI-${seg1}-${seg2}`
}

export default function KitRegisterPage() {
  const router = useRouter()
  const [inputValue, setInputValue] = useState("ORAVI-")
  const [status, setStatus] = useState<RegistrationStatus>("idle")
  const [errorMessage, setErrorMessage] = useState("")

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatKitCodeInput(e.target.value)
    setInputValue(formatted)
    setErrorMessage("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const kitCode = inputValue.trim()

    if (!validateKitCode(kitCode)) {
      setErrorMessage("Enter a valid kit code in the format ORAVI-XXXX-XXXXX.")
      return
    }

    setStatus("loading")
    setErrorMessage("")

    try {
      const res = await fetch("/api/kit/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kitCode }),
      })
      const data = await res.json() as {
        registered?: boolean
        error?: string
        status?: string
        alreadyOwned?: boolean
      }

      if (!res.ok) {
        setErrorMessage(data.error ?? "Something went wrong. Please try again.")
        setStatus("error")
        return
      }

      setStatus("success")
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.")
      setStatus("error")
    }
  }

  const isLoading = status === "loading"
  const isSuccess = status === "success"

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper, #faf9f7)", color: "var(--ink, #1a1a18)" }}>
      {/* Nav */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 32px",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}>
        <OraviLogo size="sm" showTagline={false} />
        <Link
          href="/dashboard"
          style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: 14,
            color: "var(--ink, #1a1a18)",
            textDecoration: "none",
            opacity: 0.6,
          }}
        >
          ← Dashboard
        </Link>
      </nav>

      {/* Content */}
      <main style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "64px 24px 80px",
      }}>
        <h1 style={{
          fontFamily: "var(--font-display, var(--font-manrope), system-ui, sans-serif)",
          fontSize: "clamp(36px, 6vw, 52px)",
          fontWeight: 400,
          lineHeight: 1.1,
          margin: "0 0 12px",
          letterSpacing: "-0.01em",
        }}>
          Register your kit.
        </h1>
        <p style={{
          fontFamily: "var(--font-body, sans-serif)",
          fontSize: 15,
          opacity: 0.6,
          margin: "0 0 40px",
          lineHeight: 1.5,
        }}>
          Enter the code from your kit insert.
        </p>

        {!isSuccess ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 8 }}>
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="ORAVI-XXXX-XXXXX"
                maxLength={15}
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: 18,
                  fontFamily: "var(--font-body, sans-serif)",
                  letterSpacing: "0.06em",
                  border: errorMessage
                    ? "1.5px solid #c0392b"
                    : "1.5px solid rgba(0,0,0,0.15)",
                  borderRadius: 8,
                  background: "#fff",
                  color: "var(--ink, #1a1a18)",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
              />
            </div>

            {errorMessage && (
              <p style={{
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: 13,
                color: "#c0392b",
                margin: "0 0 16px",
                lineHeight: 1.4,
              }}>
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "14px 24px",
                marginTop: errorMessage ? 0 : 16,
                background: "var(--ink, #1a1a18)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 15,
                fontFamily: "var(--font-body, sans-serif)",
                fontWeight: 500,
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {isLoading ? "Registering..." : "Register kit"}
            </button>
          </form>
        ) : (
          <div>
            {/* Success message */}
            <div style={{
              background: "#f0faf4",
              border: "1.5px solid #27ae60",
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 40,
            }}>
              <p style={{
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: 15,
                color: "#1e7e34",
                margin: 0,
                fontWeight: 500,
              }}>
                Kit registered successfully.
              </p>
              <p style={{
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: 13,
                color: "#1e7e34",
                margin: "4px 0 0",
                opacity: 0.8,
              }}>
                {inputValue} — your sample is on its way.
              </p>
            </div>

            {/* 4-step status tracker */}
            <div>
              <p style={{
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                opacity: 0.4,
                margin: "0 0 20px",
              }}>
                Kit status
              </p>
              <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {STATUS_STEPS.map((step, i) => {
                  const checked = i <= 1 // ordered + registered are done
                  return (
                    <li
                      key={step.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "12px 0",
                        borderBottom: i < STATUS_STEPS.length - 1
                          ? "1px solid rgba(0,0,0,0.06)"
                          : "none",
                      }}
                    >
                      {/* Indicator */}
                      <span style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: checked
                          ? "none"
                          : "1.5px solid rgba(0,0,0,0.18)",
                        background: checked ? "var(--gold, #c8a96e)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: 12,
                        color: "#fff",
                        fontWeight: 600,
                      }}>
                        {checked ? "✓" : ""}
                      </span>
                      <span style={{
                        fontFamily: "var(--font-body, sans-serif)",
                        fontSize: 14,
                        opacity: checked ? 1 : 0.4,
                        fontWeight: checked ? 500 : 400,
                      }}>
                        {step.label}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              style={{
                marginTop: 40,
                width: "100%",
                padding: "14px 24px",
                background: "var(--ink, #1a1a18)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 15,
                fontFamily: "var(--font-body, sans-serif)",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Back to dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
