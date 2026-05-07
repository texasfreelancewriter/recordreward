import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Org = { id: string; name: string; slug: string; role: string };

const SELECTED_ORG_KEY = "selectedOrgId";

export function getSelectedOrgId(): string | null {
  return localStorage.getItem(SELECTED_ORG_KEY);
}

export function setSelectedOrgId(id: string) {
  localStorage.setItem(SELECTED_ORG_KEY, id);
}

export function useOrgs() {
  return useQuery({
    queryKey: ["orgs"],
    queryFn: () => api.get<Org[]>("/api/organizations/mine"),
  });
}

export function useOrg() {
  const { data: orgs } = useOrgs();
  const selectedId = getSelectedOrgId();

  // Return selected org, or first org if none selected
  const org = orgs ? (orgs.find((o) => o.id === selectedId) ?? orgs[0] ?? null) : undefined;

  return { data: org, isLoading: orgs === undefined };
}
