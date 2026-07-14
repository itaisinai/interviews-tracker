import { Button, MaterialIcon } from "@interviews-tracker/design-system";

import { CompanyDetailField } from "./company-detail-field";
import { formatCompactFunding } from "./company-detail-formatters";

type CompanyFact = {
  label: string;
  value: string;
  icon: string;
};

type CompanyFactsStripProps = {
  facts: CompanyFact[];
  onResearchClick: () => void;
};

export function CompanyFactsStrip({ facts, onResearchClick }: CompanyFactsStripProps) {
  return (
    <section className="panel border border-outline-variant p-4 md:p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-x-10 gap-y-3">
          {facts.map((fact) => (
            <CompanyDetailField
              key={fact.label}
              className="shrink-0 max-w-[10.5rem]"
              icon={fact.icon}
              label={fact.label}
              value={fact.label === "Funding" ? formatCompactFunding(fact.value) : fact.value}
              truncate
            />
          ))}
        </div>

        <Button variant="primary" className="shrink-0" onClick={onResearchClick}>
          <MaterialIcon name="travel_explore" />
          Research company
        </Button>
      </div>
    </section>
  );
}
