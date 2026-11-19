import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const { llms } = await import("@/platform/server/discovery");
        return llms();
      },
    },
  },
});
