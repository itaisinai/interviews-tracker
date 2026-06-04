import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MaterialIcon } from "../components/material-icon";
import { PageIntro } from "../components/app-shell";
import { api } from "../lib/api";

export function ParseJobPage() {
  const [text, setText] = useState("");
  const { data: options } = useQuery({ queryKey: ["options"], queryFn: api.options });
  const parse = useMutation({ mutationFn: api.parseJob });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: async () => {
      if (!parse.data) throw new Error("Nothing parsed");
      const domainIds = [];
      for (const label of parse.data.company.domains) {
        const existing = options?.domains.find((item) => item.label.toLowerCase() === label.toLowerCase());
        const domain = existing ?? await api.addDomain(label) as { id: string };
        domainIds.push(domain.id);
      }
      return api.createOpportunity({
        companyName: parse.data.companyName ?? "Unknown company",
        roleTitle: parse.data.roleTitle ?? "Software Engineer",
        pipelineType: parse.data.pipelineType ?? "POTENTIAL",
        status: parse.data.status ?? "RESEARCH_LEAD",
        priority: parse.data.prioritySuggestion ?? "MEDIUM",
        referrerOrConnection: parse.data.process.knownContact,
        source: "AI parsed job description",
        nextStep: parse.data.process.suggestedNextStep,
        notes: parse.data.rawImportantNotes.join("\n"),
        location: parse.data.company.location,
        funding: parse.data.company.funding,
        companyDescription: parse.data.company.companyDescription,
        productDescription: parse.data.company.productDescription,
        customersTraction: parse.data.company.customersTraction,
        techStack: parse.data.role.techStack.join(", "),
        backendFrontendSplit: parse.data.role.backendFrontendSplit,
        compensationNotes: parse.data.role.compensation,
        domainIds
      });
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      navigate(`/opportunities/${saved.id}`);
    }
  });

  return (
    <>
      <PageIntro title="Parse Job Description" description="Paste raw company or job text, review structured CRM fields, then save." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="panel p-6 lg:col-span-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-tertiary/10 p-2 text-tertiary"><MaterialIcon name="auto_awesome" /></div>
            <h3 className="font-title-md text-title-md font-bold">Raw Input</h3>
          </div>
          <textarea className="input min-h-[360px] bg-surface-container-low" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste a long job or company description..." />
          <button className="btn btn-primary mt-4" onClick={() => parse.mutate(text)}><MaterialIcon name="psychology" />Parse</button>
        </section>
        <section className="panel p-6 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-title-md text-title-md font-bold">Review Parsed Data</h3>
            {parse.data ? <button className="btn btn-primary" onClick={() => create.mutate()}><MaterialIcon name="add" />Create opportunity</button> : null}
          </div>
          {parse.data ? <pre className="max-h-[420px] overflow-auto rounded-lg bg-surface-container-low p-4 font-geist text-xs text-on-surface-variant">{JSON.stringify(parse.data, null, 2)}</pre> : <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low text-on-surface-variant">Parsed fields will appear here.</div>}
        </section>
      </div>
    </>
  );
}
