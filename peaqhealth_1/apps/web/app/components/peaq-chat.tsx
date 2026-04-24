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
  "What does my data mean?",
  "How does Cnvrg calculate my scores?",
  "What should I read to learn more?",
]

function timestamp() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

export function CnvrgChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = sessionStorage.getItem("peaq_chat_messages")
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)

  // Persist messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("peaq_chat_messages", JSON.stringify(messages))
    }
  }, [messages])
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
      {/* Floating button — stays dark */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: 24, right: 24,
            width: 40, height: 40,
            borderRadius: "50%",
            background: "#16150F",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
          aria-label="Open chat"
        >
          <span style={{
            position: "absolute", inset: -4,
            borderRadius: "50%",
            border: "1px solid #C49A3C",
            opacity: 0,
            animation: "chatPulse 2s ease-out infinite",
          }} />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat panel — cream/white */}
      {open && (
        <div style={{
          position: "fixed",
          bottom: 24, right: 24,
          width: 360, height: 520,
          background: "#FFFFFF",
          borderRadius: 16,
          border: "0.5px solid rgba(0,0,0,0.06)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 999,
          animation: "chatIn 250ms ease-out both",
        }}>
          {/* Header — cream */}
          <div style={{
            padding: "16px 18px 12px",
            background: "#F6F4EF",
            borderBottom: "0.5px solid rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 3, height: 3, borderRadius: "50%",
                  background: "#C49A3C",
                  animation: "chatDotPulse 2s ease-in-out infinite",
                  flexShrink: 0,
                }} />
                <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 300, color: "#1a1a18" }}>
                  Ask Cnvrg
                </span>
              </div>
              <div style={{
                fontFamily: sans, fontSize: 9, letterSpacing: "1.5px",
                textTransform: "uppercase", color: "rgba(0,0,0,0.3)",
                marginTop: 2, paddingLeft: 11,
              }}>
                Knows your data. Won&rsquo;t diagnose.
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="chat-close-btn"
              aria-label="Close chat"
            >
              &times;
            </button>
          </div>

          {/* Messages — white bg */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 16,
              background: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(0,0,0,0.08) transparent",
            }}
          >
            {/* Suggestions */}
            {showSuggestions && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                <span style={{
                  fontFamily: sans, fontSize: 10,
                  color: "#bbb", letterSpacing: "0.5px",
                  marginBottom: 4,
                }}>
                  Try asking:
                </span>
                {SUGGESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="chat-suggestion"
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
                maxWidth: msg.role === "user" ? "85%" : "90%",
              }}>
                <div style={{
                  fontFamily: sans,
                  fontSize: 13,
                  padding: "12px 16px",
                  ...(msg.role === "user" ? {
                    background: "#F6F4EF",
                    borderRadius: "12px 12px 4px 12px",
                    color: "#1a1a18",
                    lineHeight: 1.6,
                  } : {
                    background: "#FFFFFF",
                    borderLeft: "2px solid rgba(196,154,60,0.4)",
                    borderRadius: "4px 12px 12px 12px",
                    color: "#1a1a18",
                    lineHeight: 1.7,
                  }),
                }}>
                  {msg.content || (streaming && i === messages.length - 1 && (
                    <span style={{
                      display: "inline-block",
                      width: 3, height: 3, borderRadius: "50%",
                      background: "#C49A3C",
                      animation: "chatDotPulse 1.5s ease-in-out infinite",
                    }} />
                  ))}
                </div>
                <div style={{
                  fontFamily: sans, fontSize: 9,
                  color: "#bbb",
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

          {/* Input area — cream bg */}
          <div style={{
            background: "#F6F4EF",
            borderTop: "0.5px solid rgba(0,0,0,0.06)",
            padding: "0 16px 14px",
            flexShrink: 0,
          }}>
            {/* Disclaimer */}
            <div style={{
              fontFamily: sans, fontSize: 8,
              color: "#bbb",
              textAlign: "center",
              borderTop: "0.5px solid rgba(0,0,0,0.04)",
              paddingTop: 6,
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
                className="chat-input"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={streaming || !input.trim()}
                style={{
                  width: 28, height: 28,
                  borderRadius: "50%",
                  background: input.trim() && !streaming ? "#C49A3C" : "rgba(0,0,0,0.06)",
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
        @keyframes chatDotPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes chatIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chat-close-btn {
          background: none; border: none; cursor: pointer;
          color: #bbb; font-size: 18px; padding: 0 4px;
          line-height: 1; transition: color 150ms ease;
        }
        .chat-close-btn:hover { color: #1a1a18; }
        .chat-suggestion {
          font-family: ${sans};
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 7px 14px;
          border-radius: 20px;
          border: 0.5px solid rgba(0,0,0,0.08);
          background: #F6F4EF;
          color: #8C8A82;
          cursor: pointer;
          text-align: left;
          transition: background 150ms ease, border-color 150ms ease;
        }
        .chat-suggestion:hover {
          background: rgba(196,154,60,0.06);
          border-color: rgba(196,154,60,0.2);
        }
        .chat-input {
          flex: 1;
          font-family: ${sans};
          font-size: 13px;
          color: #1a1a18;
          background: #FFFFFF;
          border: 0.5px solid rgba(0,0,0,0.10);
          border-radius: 8px;
          padding: 10px 14px;
          outline: none;
          transition: border-color 150ms ease;
        }
        .chat-input::placeholder { color: #bbb; }
        .chat-input:focus { border-color: rgba(196,154,60,0.4); }
      `}</style>
    </>
  )
}
