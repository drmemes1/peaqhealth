"use client"

import { useState, useRef, useEffect, useCallback } from "react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', system-ui, sans-serif"

interface Message {
  role: "user" | "assistant"
  content: string
  time: string
}

const SUGGESTIONS = [
  "Why did my score change?",
  "What's driving my cross-panel signal?",
  "Which marker should I focus on?",
]

function timestamp() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

export function PeaqChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return

    const userMsg: Message = { role: "user", content: text.trim(), time: timestamp() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setStreaming(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) {
        setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again.", time: timestamp() }])
        setStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ""

      // Add empty assistant message to stream into
      setMessages(prev => [...prev, { role: "assistant", content: "", time: timestamp() }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantContent += decoder.decode(value, { stream: true })
        const content = assistantContent
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content, time: timestamp() }
          return copy
        })
        scrollToBottom()
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again.", time: timestamp() }])
    } finally {
      setStreaming(false)
    }
  }, [messages, streaming, scrollToBottom])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const showSuggestions = messages.length === 0

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#16150F",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          }}
          aria-label="Open chat"
        >
          {/* Pulsing ring */}
          <span style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: "1px solid #C49A3C",
            opacity: 0,
            animation: "chatPulse 2s ease-out infinite",
          }} />
          {/* Speech bubble icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 360,
          height: 520,
          background: "#16150F",
          borderRadius: 16,
          border: "0.5px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 999,
          animation: "chatIn 250ms ease-out both",
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 18px 12px",
            borderBottom: "0.5px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 300, color: "#fff" }}>
                Ask Peaq
              </div>
              <div style={{
                fontFamily: sans, fontSize: 9, letterSpacing: "1.5px",
                textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
                marginTop: 2,
              }}>
                Knows your data. Won&rsquo;t diagnose.
              </div>
            </div>
            <button
              onClick={() => { setOpen(false); setMessages([]) }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.4)", fontSize: 16, padding: "0 4px",
                lineHeight: 1,
              }}
              aria-label="Close chat"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.1) transparent",
            }}
          >
            {/* Suggestions */}
            {showSuggestions && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 8,
              }}>
                <span style={{
                  fontFamily: sans, fontSize: 10,
                  color: "rgba(255,255,255,0.25)",
                  letterSpacing: "0.5px",
                  marginBottom: 4,
                }}>
                  Try asking:
                </span>
                {SUGGESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      fontFamily: sans,
                      fontSize: 10,
                      padding: "6px 12px",
                      borderRadius: 20,
                      border: "0.5px solid rgba(255,255,255,0.1)",
                      background: "transparent",
                      color: "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 150ms ease, color 150ms ease",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.5)" }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}>
                <div style={{
                  fontFamily: sans,
                  fontSize: 12,
                  lineHeight: 1.6,
                  padding: "10px 14px",
                  ...(msg.role === "user" ? {
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: "12px 12px 4px 12px",
                    color: "rgba(255,255,255,0.8)",
                  } : {
                    background: "rgba(196,154,60,0.08)",
                    borderLeft: "2px solid rgba(196,154,60,0.3)",
                    borderRadius: "4px 12px 12px 12px",
                    color: "rgba(255,255,255,0.75)",
                  }),
                }}>
                  {msg.content || (streaming && i === messages.length - 1 && (
                    <span style={{
                      display: "inline-block",
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#C49A3C",
                      animation: "chatPulse 1.5s ease-in-out infinite",
                    }} />
                  ))}
                </div>
                <div style={{
                  fontFamily: sans, fontSize: 8,
                  color: "rgba(255,255,255,0.2)",
                  marginTop: 4,
                  textAlign: msg.role === "user" ? "right" : "left",
                  paddingLeft: msg.role === "assistant" ? 4 : 0,
                  paddingRight: msg.role === "user" ? 4 : 0,
                }}>
                  {msg.time}
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer + input */}
          <div style={{
            borderTop: "0.5px solid rgba(255,255,255,0.07)",
            padding: "8px 16px 14px",
            flexShrink: 0,
          }}>
            <div style={{
              fontFamily: sans, fontSize: 7,
              color: "rgba(255,255,255,0.2)",
              textAlign: "center",
              marginBottom: 8,
            }}>
              Not medical advice. Data interpreter only.
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your data..."
                disabled={streaming}
                style={{
                  flex: 1,
                  fontFamily: sans,
                  fontSize: 12,
                  color: "#fff",
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  outline: "none",
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={streaming || !input.trim()}
                style={{
                  width: 28, height: 28,
                  borderRadius: "50%",
                  background: input.trim() && !streaming ? "#C49A3C" : "rgba(255,255,255,0.08)",
                  border: "none",
                  cursor: input.trim() && !streaming ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 150ms ease",
                }}
                aria-label="Send"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatPulse {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0; transform: scale(2.2); }
        }
        @keyframes chatIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
