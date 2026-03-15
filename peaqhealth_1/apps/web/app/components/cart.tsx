"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface CartPanelProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

export function CartPanel({ open, onClose, items, onUpdateQty, onRemove }: CartPanelProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  async function handleCheckoutEmail(e: React.FormEvent) {
    e.preventDefault();
    const sb = createClient();
    await sb.from("waitlist").upsert({ email, source: "checkout" }, { onConflict: "email" });
    setSubmitted(true);
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className="fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col bg-off-white transition-transform duration-300"
        style={{
          transform: open ? "translateX(0)" : "translateX(100%)",
          borderLeft: "0.5px solid var(--ink-12)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--ink-12)" }}>
          <span className="font-body text-xs uppercase tracking-[0.1em]" style={{ color: "var(--ink-60)" }}>
            Cart {items.length > 0 && `· ${items.length}`}
          </span>
          <button onClick={onClose} className="font-body text-xs uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>
            Close
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {items.length === 0 ? (
            <p className="font-body text-sm" style={{ color: "var(--ink-30)" }}>
              Your cart is empty.
            </p>
          ) : (
            items.map(({ product, quantity }) => (
              <div key={product.id} className="flex items-start justify-between gap-4 py-3 border-b" style={{ borderColor: "var(--ink-06)" }}>
                <div className="flex-1">
                  <p className="font-display text-base font-light" style={{ color: "var(--ink)" }}>{product.name}</p>
                  <p className="font-body text-xs mt-0.5" style={{ color: "var(--ink-60)" }}>${product.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => quantity > 1 ? onUpdateQty(product.id, quantity - 1) : onRemove(product.id)}
                          className="w-6 h-6 border flex items-center justify-center font-body text-sm" style={{ borderColor: "var(--ink-12)", color: "var(--ink-60)" }}>−</button>
                  <span className="font-body text-sm w-4 text-center" style={{ color: "var(--ink)" }}>{quantity}</span>
                  <button onClick={() => onUpdateQty(product.id, quantity + 1)}
                          className="w-6 h-6 border flex items-center justify-center font-body text-sm" style={{ borderColor: "var(--ink-12)", color: "var(--ink-60)" }}>+</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t px-6 py-5 flex flex-col gap-4" style={{ borderColor: "var(--ink-12)" }}>
            <div className="flex items-center justify-between">
              <span className="font-body text-xs uppercase tracking-widest" style={{ color: "var(--ink-60)" }}>Subtotal</span>
              <span className="font-display text-xl font-light" style={{ color: "var(--ink)" }}>${subtotal}</span>
            </div>
            {!checkoutOpen && !submitted && (
              <button
                onClick={() => setCheckoutOpen(true)}
                className="h-12 w-full font-body text-xs uppercase tracking-[0.08em] text-white transition-colors hover:opacity-85"
                style={{ background: "var(--ink)" }}
              >
                Checkout →
              </button>
            )}
            {checkoutOpen && !submitted && (
              <form onSubmit={handleCheckoutEmail} className="flex flex-col gap-3">
                <p className="font-body text-xs leading-relaxed" style={{ color: "var(--ink-60)" }}>
                  We&apos;re preparing checkout. Enter your email and we&apos;ll notify you the moment it&apos;s ready.
                </p>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-10 border bg-off-white px-3 font-body text-sm outline-none focus:border-ink transition-colors"
                  style={{ borderColor: "var(--ink-30)", color: "var(--ink)" }}
                />
                <button type="submit" className="h-10 font-body text-xs uppercase tracking-[0.08em] text-white" style={{ background: "var(--ink)" }}>
                  Notify me
                </button>
              </form>
            )}
            {submitted && (
              <p className="font-display text-base italic" style={{ color: "var(--gold)" }}>
                We&apos;ll be in touch.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
