import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { PageIntro } from "../components/app-shell";
import { MaterialIcon } from "../components/material-icon";
import { LoadingButton, PageErrorState, PageLoadingState } from "../components/loading-state";
import { api } from "../lib/api";
import type { JobStatus, PipelineType, Priority } from "../lib/types";

type FormValues = {
  companyName: string;
  roleTitle: string;
  pipelineType: PipelineType;
  status: JobStatus;
  priority: Priority;
  referrerOrConnection: string;
  source: string;
  jobUrl: string;
  nextStep: string;
  notes: string;
  employeesRangeId: string;
  companyStageId: string;
  workModelId: string;
  location: string;
  funding: string;
  customersTraction: string;
  companyDescription: string;
  productDescription: string;
  techStack: string;
  backendFrontendSplit: string;
  compensationNotes: string;
  domainIds: string[];
};

export function OpportunityFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: options, isLoading: optionsLoading, isError: optionsError, error: optionsErrorValue, refetch: refetchOptions } = useQuery({ queryKey: ["options"], queryFn: api.options });
  const { data: existing, isLoading: existingLoading, isError: existingError, error: existingErrorValue, refetch: refetchExisting } = useQuery({ queryKey: ["opportunity", id], queryFn: () => api.opportunity(id ?? ""), enabled: Boolean(id) });
  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues: { pipelineType: "POTENTIAL", status: "RESEARCH_LEAD", priority: "MEDIUM", domainIds: [] } });
  const mutation = useMutation({
    mutationFn: (values: FormValues) => id ? api.updateOpportunity(id, values) : api.createOpportunity(values),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      navigate(`/opportunities/${saved.id}`);
    }
  });

  useEffect(() => {
    if (existing) {
      reset({
        companyName: existing.companyName,
        roleTitle: existing.roleTitle,
        pipelineType: existing.pipelineType,
        status: existing.status,
        priority: existing.priority,
        referrerOrConnection: existing.referrerOrConnection ?? "",
        source: existing.source ?? "",
        jobUrl: existing.jobUrl ?? "",
        nextStep: existing.nextStep ?? "",
        notes: existing.notes ?? "",
        employeesRangeId: existing.employeesRangeId ?? "",
        companyStageId: existing.companyStageId ?? "",
        workModelId: existing.workModelId ?? "",
        location: existing.location ?? "",
        funding: existing.funding ?? "",
        customersTraction: existing.customersTraction ?? "",
        companyDescription: existing.companyDescription ?? "",
        productDescription: existing.productDescription ?? "",
        techStack: existing.techStack ?? "",
        backendFrontendSplit: existing.backendFrontendSplit ?? "",
        compensationNotes: existing.compensationNotes ?? "",
        domainIds: existing.domains.map((item) => item.domain.id)
      });
    }
  }, [existing, reset]);

  if (optionsLoading || (id ? existingLoading : false)) {
    return <PageLoadingState title={id ? "Edit Opportunity" : "Add Opportunity"} description="Loading form options and existing values." />;
  }

  if (optionsError) {
    return <PageErrorState title="Opportunity form" description={optionsErrorValue instanceof Error ? optionsErrorValue.message : "Unable to load form options."} onRetry={() => void refetchOptions()} />;
  }

  if (existingError) {
    return <PageErrorState title="Opportunity form" description={existingErrorValue instanceof Error ? existingErrorValue.message : "Unable to load the selected opportunity."} onRetry={() => void refetchExisting()} />;
  }

  return (
    <>
      <PageIntro title={id ? "Edit Opportunity" : "Add Opportunity"} description="Capture the company, role, research context, and next step." />
      <form className="space-y-6" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <Section title="Basic">
          <Field label="Company name"><input className="input" {...register("companyName", { required: true })} /></Field>
          <Field label="Role title"><input className="input" {...register("roleTitle", { required: true })} /></Field>
          <Field label="Pipeline type"><select className="input" {...register("pipelineType")}><option>POTENTIAL</option><option>ACTIVE_PROCESS</option><option>ARCHIVED</option></select></Field>
          <Field label="Status"><select className="input" {...register("status")}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Priority"><select className="input" {...register("priority")}><option>HIGH</option><option>MEDIUM</option><option>LOW</option><option>MAYBE</option></select></Field>
          <Field label="Referrer / connection"><input className="input" {...register("referrerOrConnection")} /></Field>
          <Field label="Job URL"><input className="input" {...register("jobUrl")} /></Field>
          <Field label="Source"><input className="input" {...register("source")} /></Field>
        </Section>
        <Section title="Company details">
          <Field label="Company size"><select className="input" {...register("employeesRangeId")}><option value="">Unset</option>{options?.companySizes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
          <Field label="Stage"><select className="input" {...register("companyStageId")}><option value="">Unset</option>{options?.companyStages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
          <Field label="Domains"><select className="input min-h-28" multiple {...register("domainIds")}>{options?.domains.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
          <Field label="Work model"><select className="input" {...register("workModelId")}><option value="">Unset</option>{options?.workModels.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
          <Field label="Location"><input className="input" {...register("location")} /></Field>
          <Field label="Funding"><input className="input" {...register("funding")} /></Field>
          <Field label="Customers / traction"><textarea className="input" {...register("customersTraction")} /></Field>
          <Field label="Company description"><textarea className="input" {...register("companyDescription")} /></Field>
          <Field label="Product description"><textarea className="input" {...register("productDescription")} /></Field>
        </Section>
        <Section title="Role details">
          <Field label="Tech stack"><textarea className="input" {...register("techStack")} /></Field>
          <Field label="Backend/frontend split"><input className="input" {...register("backendFrontendSplit")} /></Field>
          <Field label="Compensation notes"><textarea className="input" {...register("compensationNotes")} /></Field>
          <Field label="Next step"><input className="input" {...register("nextStep")} /></Field>
          <Field label="General notes"><textarea className="input" {...register("notes")} /></Field>
        </Section>
        <LoadingButton className="btn btn-primary" type="submit" loading={mutation.isPending} loadingLabel="Saving..." icon="save">
          Save Opportunity
        </LoadingButton>
      </form>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel grid grid-cols-1 gap-4 p-6 lg:grid-cols-2"><h3 className="col-span-full font-title-md text-title-md font-bold">{title}</h3>{children}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1"><span className="label">{label}</span>{children}</label>;
}

const statuses = ["RESEARCH_LEAD", "TO_APPLY", "APPLIED", "RECRUITER_REACHED_OUT", "PHONE_SCHEDULED", "PHONE_DONE", "TECHNICAL_SCHEDULED", "TECHNICAL_DONE", "HOME_ASSIGNMENT", "ASSIGNMENT_SUBMITTED", "FINAL_STAGE", "OFFER", "REJECTED", "PAUSED", "NOT_RELEVANT"];
