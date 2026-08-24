"use client";

import ThemeSwitcher from "@/components/ThemeSwitcher";
import WorkoutLogger from "@/components/WorkoutLogger";
import MealLogger from "@/components/MealLogger";
import { usingSupabase } from "@/lib/store";

export default function Home() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="wordmark">
            <span className="wordmark-dots">
              <i />
              <i />
              <i />
            </span>
            Trackline
          </span>
          <ThemeSwitcher />
        </div>
      </header>

      <main className="shell">
        <section className="hero">
          <div className="eyebrow">Fitness &amp; Nutrition</div>
          <h1>
            Train. Eat. <em>Track the trend.</em>
          </h1>
          <p>
            Log what you trained today and tell Claude what you just ate — it
            handles the calories and macros. One tracker, three looks: switch
            themes in the top right.
          </p>
          <div className="hero-rule" />
        </section>

        {!usingSupabase && (
          <div className="notice">
            <strong>Demo mode:</strong> data is stored only in this browser.
            Add your Supabase keys in <code>.env.local</code> (see the README)
            to sync across devices.
          </div>
        )}

        <div className="grid">
          <WorkoutLogger />
          <MealLogger />
        </div>

        <p className="footer-note">
          Macro estimates are AI-generated approximations, not medical advice.
        </p>
      </main>
    </>
  );
}
