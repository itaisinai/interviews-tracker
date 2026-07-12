import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageErrorState, PageLoadingState } from "@interviews-tracker/design-system";

import { useBreadcrumbs } from "../components/app-shell";
import { CompanyDetailView } from "../components/company-detail";
import { api } from "../lib/api";

export function CompanyDetailPage() {
  const { companySlugOrId = "" } = useParams();
  const decodedSlugOrId = decodeURIComponent(companySlugOrId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setBreadcrumbs } = useBreadcrumbs();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["company", decodedSlugOrId],
    queryFn: () => api.company(decodedSlugOrId),
    enabled: Boolean(decodedSlugOrId),
  });

  const deleteCompany = useMutation({
    mutationFn: () => api.deleteCompany(decodedSlugOrId),
    onSuccess: () => navigate("/companies"),
  });

  const deleteInteraction = useMutation({
    mutationFn: (interactionSlug: string) => api.deleteInteraction(interactionSlug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", decodedSlugOrId] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  useEffect(() => {
    if (data) {
      setBreadcrumbs([
        {
          label: "Companies",
          element: (
            <Link to="/companies" className="font-medium text-primary transition-colors hover:text-primary/80">
              Companies
            </Link>
          ),
        },
        { label: data.name },
      ]);
    }
    return () => setBreadcrumbs([]);
  }, [data, setBreadcrumbs]);

  if (isLoading || !data) {
    return <PageLoadingState title="Company" description="Loading company details, opportunities, and interactions." />;
  }

  if (isError) {
    return (
      <PageErrorState
        title="Company"
        description={error instanceof Error ? error.message : "Unable to load company details."}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <CompanyDetailView
      company={data}
      isRefreshing={isFetching}
      isDeletingCompany={deleteCompany.isPending}
      onDeleteCompany={() => deleteCompany.mutate()}
      onDeleteInteraction={(interactionSlug) => deleteInteraction.mutate(interactionSlug)}
      isDeletingInteraction={(interactionSlug) =>
        deleteInteraction.isPending && deleteInteraction.variables === interactionSlug
      }
      onResearchSaved={(research, newSlug) => {
        if (newSlug && newSlug !== decodedSlugOrId) {
          // Slug changed, navigate to new URL
          navigate(`/companies/${encodeURIComponent(newSlug)}`, { replace: true });
        } else {
          // Slug unchanged, just refresh data
          void queryClient.invalidateQueries({ queryKey: ["company", decodedSlugOrId] });
          void queryClient.invalidateQueries({ queryKey: ["companies"] });
        }
      }}
    />
  );
}
