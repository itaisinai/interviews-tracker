import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageErrorState, PageLoadingState } from "@interviews-tracker/design-system";

import { CompanyDetailView } from "../components/company-detail";
import { api } from "../lib/api";

export function CompanyDetailPage() {
  const { companySlugOrId = "" } = useParams();
  const decodedSlugOrId = decodeURIComponent(companySlugOrId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    mutationFn: (id: string) => api.deleteInteraction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", decodedSlugOrId] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

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
      onDeleteInteraction={(interactionId) => deleteInteraction.mutate(interactionId)}
      isDeletingInteraction={(interactionId) =>
        deleteInteraction.isPending && deleteInteraction.variables === interactionId
      }
      onResearchSaved={(research) => {
        // Refresh the current company data after research is saved
        void queryClient.invalidateQueries({ queryKey: ["company", decodedSlugOrId] });
        void queryClient.invalidateQueries({ queryKey: ["companies"] });
      }}
    />
  );
}
