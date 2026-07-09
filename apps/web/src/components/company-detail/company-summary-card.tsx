import { useState } from "react";

import { ChevronDown } from "lucide-react";

import { CompanyDetailField } from "./company-detail-field";

type SummaryRow = {
  label: string;
  value: string;
  href?: string | null;
};

type CompanySummaryCardProps = {
  title: string;
  rows: SummaryRow[];
  moreRows?: SummaryRow[];
  defaultRows: number;
};

export function CompanySummaryCard({ title, rows, moreRows = [], defaultRows }: CompanySummaryCardProps) {
  const [showMore, setShowMore] = useState(false);
  const visibleRows = showMore ? [...rows, ...moreRows] : rows.slice(0, defaultRows);

  return (
    <section className="panel p-5">
      <h3 className="font-title-md text-title-md font-bold">{title}</h3>
      <div className="mt-5 space-y-4">
        {visibleRows.map((row) => (
          <CompanyDetailField key={row.label} label={row.label} value={row.value} href={row.href} />
        ))}
      </div>

      {moreRows.length > 0 ? (
        <button
          type="button"
          className="mt-5 inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:text-primary/80"
          onClick={() => setShowMore((value) => !value)}
        >
          {showMore ? "Show less" : "Show more"}
          <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
        </button>
      ) : null}
    </section>
  );
}
