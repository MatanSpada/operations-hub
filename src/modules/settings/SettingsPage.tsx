/**
 * src/modules/settings/SettingsPage.tsx
 * =======================================
 * Settings & Admin module — configuration, master lists, GAS connection info.
 */

import React from "react";
import { InitialData } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { APP_META, GOOGLE_APPS_SCRIPT_URL, SHEET_NAMES } from "@/config";
import { Settings, Database, Link, Info } from "lucide-react";

interface Props { data: InitialData; }

export const SettingsPage: React.FC<Props> = ({ data }) => {
  const { departments, apartments, qualifications } = data;
  const isConnected = !GOOGLE_APPS_SCRIPT_URL.includes("YOUR_SCRIPT_ID_HERE");

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader title="הגדרות" subtitle="ניהול רשימות, קישור Google Sheets, ותצורה כללית" />

      {/* Connection Status */}
      <section className="bg-card rounded-lg shadow-card p-6 space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Link size={16} /> חיבור Google Apps Script</h3>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${isConnected ? "bg-status-success-bg text-status-success-text" : "bg-status-warning-bg text-status-warning-text"}`}>
          {isConnected ? "✓ מחובר" : "⚠ לא מוגדר — מצב הדגמה"}
        </div>
        {!isConnected && (
          <p className="text-sm text-muted-foreground">
            כדי לחבר נתונים אמיתיים: עדכן את <code className="bg-muted px-1 rounded text-xs">GOOGLE_APPS_SCRIPT_URL</code> בקובץ <code className="bg-muted px-1 rounded text-xs">src/config.ts</code>
          </p>
        )}
        <p className="text-xs text-muted-foreground font-mono break-all">{GOOGLE_APPS_SCRIPT_URL}</p>
      </section>

      {/* Sheet Names Map */}
      <section className="bg-card rounded-lg shadow-card p-6 space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Database size={16} /> מיפוי גיליונות Google Sheets</h3>
        <p className="text-sm text-muted-foreground">שמות הגיליונות חייבים להתאים בדיוק לגיליון Google Sheets שלך. לשינוי — ערוך את <code className="bg-muted px-1 rounded text-xs">SHEET_NAMES</code> ב-config.ts</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(SHEET_NAMES).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between bg-muted rounded px-3 py-2 text-xs">
              <span className="text-muted-foreground">{key}</span>
              <span className="font-mono font-semibold">{val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Master Lists */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="bg-card rounded-lg shadow-card p-5 space-y-3">
          <h3 className="font-semibold text-sm">מחלקות ({data.departments.length})</h3>
          <ul className="space-y-1">
            {departments.map((d) => (
              <li key={d.id} className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                {d.name}
              </li>
            ))}
          </ul>
        </section>
        <section className="bg-card rounded-lg shadow-card p-5 space-y-3">
          <h3 className="font-semibold text-sm">דירות ({apartments.length})</h3>
          <ul className="space-y-1">
            {apartments.map((a) => (
              <li key={a.id} className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                {a.name}
              </li>
            ))}
          </ul>
        </section>
        <section className="bg-card rounded-lg shadow-card p-5 space-y-3">
          <h3 className="font-semibold text-sm">הכשרות ({qualifications.length})</h3>
          <ul className="space-y-1">
            {qualifications.map((q) => (
              <li key={q.id} className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                {q.name}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* App info */}
      <section className="bg-card rounded-lg shadow-card p-5 flex items-center gap-3 text-sm text-muted-foreground">
        <Info size={16} />
        <span>{APP_META.name} — גרסה {APP_META.version}</span>
      </section>
    </div>
  );
};
