"use client";

import Link from "next/link";
import { CERTIFICATE_TYPES } from "@/lib/schema";
import { useLanguage } from "@/components/LanguageContext";
import Header from "@/components/Header";
import { ArrowRight, FileCheck2, MapPinned, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [trackId, setTrackId] = useState("");

  const income = CERTIFICATE_TYPES.find((c) => c.id === "income");
  const others = CERTIFICATE_TYPES.filter((c) => c.id !== "income");

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero: the problem, stated plainly */}
        <section className="max-w-5xl mx-auto px-4 pt-10 pb-8">
          <p className="stamp text-alert text-xs mb-5 w-fit">
            {t("Prototype · mock data", "प्रोटोटाइप · नमूना डेटा")}
          </p>
          <h1 className="font-body text-3xl sm:text-4xl font-bold leading-tight max-w-2xl text-balance">
            {t(
              "You shouldn't have to visit a tehsil office to find out your certificate got rejected.",
              "आपको यह पता लगाने के लिए तहसील कार्यालय जाने की ज़रूरत नहीं होनी चाहिए कि आपका प्रमाण पत्र अस्वीकृत हो गया।"
            )}
          </h1>
          <p className="mt-4 text-ink-soft max-w-xl leading-relaxed">
            {t(
              "Income, domicile and caste certificates get rejected for small, fixable reasons — a missing stamp, an old address proof — but you usually find out weeks later, in person. Saral Praman checks your documents before you submit, and tells you in plain language what's happening at every stage.",
              "आय, अधिवास और जाति प्रमाण पत्र अक्सर छोटी, ठीक की जा सकने वाली वजहों से अस्वीकृत होते हैं — जैसे मुहर न होना, या पुराना पता प्रमाण — लेकिन इसका पता अक्सर हफ्तों बाद, व्यक्तिगत रूप से चलता है। सरल प्रमाण आपके दस्तावेज़ जमा करने से पहले जांचता है, और हर चरण पर सरल भाषा में बताता है कि क्या हो रहा है।"
            )}
          </p>
        </section>

        {/* Three real problems this addresses, stated concretely */}
        <section className="max-w-5xl mx-auto px-4 pb-10">
          <div className="grid sm:grid-cols-3 gap-3">
            <ProblemCard
              icon={<FileCheck2 size={20} />}
              title={t("Rejected on a technicality", "मामूली कारण से अस्वीकृत")}
              body={t(
                "An unstamped affidavit or a 7-month-old bill slips through, and you only learn weeks later.",
                "बिना मुहर का शपथ पत्र या 7 महीने पुराना बिल पास हो जाता है, और आपको हफ्तों बाद पता चलता है।"
              )}
            />
            <ProblemCard
              icon={<MapPinned size={20} />}
              title={t("No idea where it's stuck", "पता नहीं कहां अटका है")}
              body={t(
                "\"Under process\" for three weeks, with no way to know if it's with the Patwari or the Tehsildar.",
                "तीन हफ्तों से \"प्रक्रियाधीन\" — यह जानने का कोई तरीका नहीं कि यह पटवारी के पास है या तहसीलदार के पास।"
              )}
            />
            <ProblemCard
              icon={<MessageCircleQuestion size={20} />}
              title={t("No one to ask", "पूछने वाला कोई नहीं")}
              body={t(
                "Helpline queues are long, and the portal's error messages assume you already know the process.",
                "हेल्पलाइन पर लंबी कतार, और पोर्टल के त्रुटि संदेश मान लेते हैं कि आपको प्रक्रिया पहले से पता है।"
              )}
            />
          </div>
        </section>

        {/* Certificate picker */}
        <section className="max-w-5xl mx-auto px-4 pb-6">
          <h2 className="text-lg font-semibold mb-3">
            {t("Apply for a certificate", "प्रमाण पत्र के लिए आवेदन करें")}
          </h2>

          <Link
            href="/apply/income"
            className="group block rounded-2xl border-2 border-authority bg-paper-raised p-5 hover:bg-authority-soft transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">{t(income.name, income.nameHi)}</h3>
                <p className="text-sm text-ink-soft mt-1 max-w-md">{income.description}</p>
              </div>
              <ArrowRight className="shrink-0 mt-1 text-authority group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {others.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border-2 border-dashed border-rule p-4 opacity-70"
                aria-disabled
              >
                <h3 className="font-medium">{t(c.name, c.nameHi)}</h3>
                <p className="text-xs text-ink-soft mt-1">
                  {t("Coming soon — same checklist engine, different rules.", "जल्द आ रहा है — वही जांच प्रणाली, अलग नियमों के साथ।")}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Track existing */}
        <section className="max-w-5xl mx-auto px-4 pb-14">
          <div className="rounded-2xl bg-authority text-paper p-5">
            <h2 className="font-semibold flex items-center gap-2">
              <ShieldCheck size={18} />
              {t("Already applied? Track your application", "पहले से आवेदन किया है? अपना आवेदन ट्रैक करें")}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (trackId.trim()) router.push(`/status/${trackId.trim()}`);
              }}
              className="mt-3 flex flex-col sm:flex-row gap-2"
            >
              <input
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                placeholder={t("Application ID, e.g. SP-2026-AB12CD", "आवेदन आईडी, जैसे SP-2026-AB12CD")}
                className="flex-1 rounded-lg px-3 py-2.5 text-ink bg-paper-raised placeholder:text-ink-soft/70 focus-visible:outline-paper"
              />
              <button
                type="submit"
                className="rounded-lg px-4 py-2.5 bg-paper text-authority font-medium hover:bg-paper/90"
              >
                {t("Track", "ट्रैक करें")}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-rule bg-paper-raised">
        <div className="max-w-5xl mx-auto px-4 py-6 text-xs text-ink-soft leading-relaxed">
          {t(
            "Saral Praman is an independent hackathon prototype. It is not affiliated with, endorsed by, or connected to any state or central government department. All applications, documents and status updates on this site are synthetic demo data.",
            "सरल प्रमाण एक स्वतंत्र हैकाथॉन प्रोटोटाइप है। यह किसी राज्य या केंद्र सरकार के विभाग से संबद्ध, अनुमोदित या जुड़ा हुआ नहीं है। इस साइट पर सभी आवेदन, दस्तावेज़ और स्टेटस अपडेट नमूना डेटा हैं।"
          )}
        </div>
      </footer>
    </>
  );
}

function ProblemCard({ icon, title, body }) {
  return (
    <div className="rounded-xl border border-rule bg-paper-raised p-4">
      <div className="w-8 h-8 rounded-full bg-alert-soft text-alert grid place-items-center mb-2.5">
        {icon}
      </div>
      <h3 className="font-medium text-sm">{title}</h3>
      <p className="text-xs text-ink-soft mt-1 leading-relaxed">{body}</p>
    </div>
  );
}
