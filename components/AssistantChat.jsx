"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "./LanguageContext";
import { Send, Loader2, Sparkles } from "lucide-react";

export default function AssistantChat({ applicationId }) {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: t(
        "Hi! I can explain your application status, what each stage means, or what to do next. What would you like to know?",
        "नमस्ते! मैं आपके आवेदन की स्थिति, हर चरण का मतलब, या आगे क्या करना है, समझा सकता हूं। आप क्या जानना चाहेंगे?"
      ),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestions =
    lang === "hi"
      ? ["मेरा आवेदन क्यों अटका है?", "इसमें कितना समय लगेगा?", "अस्वीकृत होने पर क्या करूं?"]
      : ["Why is my application stuck?", "How long will this take?", "What if it gets rejected?"];

  async function send(text) {
    if (!text.trim() || loading) return;
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          applicationId,
          language: lang,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, mocked: data.mocked }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("Sorry, something went wrong. Please try again.", "क्षमा करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।") },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-authority/30 bg-paper-raised overflow-hidden flex flex-col h-[26rem]">
      <div className="bg-authority text-paper px-4 py-2.5 flex items-center gap-2 text-sm font-medium">
        <Sparkles size={16} />
        {t("Ask about your application", "अपने आवेदन के बारे में पूछें")}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                m.role === "user" ? "bg-authority text-paper rounded-br-sm" : "bg-paper border border-rule rounded-bl-sm"
              }`}
            >
              {m.content}
              {m.mocked && (
                <p className="mt-1 text-[10px] uppercase tracking-wide opacity-60">
                  {t("Demo mode reply", "डेमो मोड जवाब")}
                </p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-paper border border-rule rounded-2xl rounded-bl-sm px-3.5 py-2">
              <Loader2 size={16} className="animate-spin text-ink-soft" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs bg-authority-soft text-authority rounded-full px-3 py-1.5"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-rule p-2.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("Type your question…", "अपना प्रश्न लिखें…")}
          className="flex-1 rounded-full border border-rule px-3.5 py-2 text-sm bg-paper focus-visible:border-authority"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label={t("Send", "भेजें")}
          className="w-9 h-9 rounded-full bg-authority text-paper grid place-items-center disabled:opacity-40 shrink-0"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
