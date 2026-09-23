import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import { toastFailure } from "@/lib/toast";
import "@/query-meta";

function report(error: unknown) {
  if (error instanceof ApiError && error.silent) {
    return;
  }
  toastFailure(error);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError(error, query) {
      if (query.meta?.toast === false) {
        return;
      }
      report(error);
    },
  }),
  mutationCache: new MutationCache({
    onError(error, _variables, _context, mutation) {
      if (mutation.meta?.toast === false) {
        return;
      }
      report(error);
    },
  }),
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
  },
});
