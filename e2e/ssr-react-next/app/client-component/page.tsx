import ClientIsland from "./ClientIsland";

/**
 * A client component rendering a custom element. Next server-renders it through
 * the SSR (not react-server) module graph, then hydrates it in the browser —
 * both halves go through the sync wrapper, whose `BROWSER` branch has to agree
 * with what the server emitted.
 */
export const dynamic = "force-dynamic";

export default function ClientComponentPage() {
  return <ClientIsland title="Client Island" />;
}
