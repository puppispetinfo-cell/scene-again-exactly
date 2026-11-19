import { createIsomorphicFn } from "@tanstack/react-start";
import { getCspNonce } from "@/platform/server/csp";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const requestNonce = createIsomorphicFn()
  .server(() => getCspNonce())
  .client(() => undefined);
export const getRouter = () => {
  const queryClient = new QueryClient();
  const nonce = requestNonce();

  const router = createRouter({
    routeTree,
    ssr: nonce ? { nonce } : {},
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
