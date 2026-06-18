"use client";

import { useEffect, useState } from "react";
import type { ScenarioId } from "@/entities/types";
import { useLocale } from "@/features/locale-toggle/locale-context";

interface ScenarioOption {
  id: ScenarioId;
  label: { en: string; ru: string };
}

export function ScenarioSwitcher() {
  const { t } = useLocale();
  const [scenarios, setScenarios] = useState<ScenarioOption[]>([]);
  const [active, setActive] = useState<ScenarioId>("normal");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/scenario/start")
      .then((r) => r.json())
      .then((data) => {
        setScenarios(data.scenarios ?? []);
        setActive(data.active ?? "normal");
      })
      .catch(() => {});
  }, []);

  const handleChange = async (id: ScenarioId) => {
    setLoading(true);
    try {
      const res = await fetch("/api/scenario/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: id }),
      });
      const data = await res.json();
      setActive(data.active ?? id);
      window.dispatchEvent(new CustomEvent("scenario-changed", { detail: id }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      value={active}
      onChange={(e) => handleChange(e.target.value as ScenarioId)}
      disabled={loading}
      className="h-8 max-w-[200px] rounded-md border border-[#30363D] bg-[#161B22] px-2 text-xs text-[#E6EDF3] outline-none focus:border-[#22D3EE]/50"
    >
      {scenarios.map((s) => (
        <option key={s.id} value={s.id}>
          {t(s.label.en, s.label.ru)}
        </option>
      ))}
    </select>
  );
}
