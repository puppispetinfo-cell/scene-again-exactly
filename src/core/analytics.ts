import { z } from "@/lib/validation";
const property = z.object({ property_id: z.string().min(1) });
export const eventPayloads = {
  page_view: z.object({
    page_path: z
      .string()
      .startsWith("/")
      .refine((v) => !v.includes("?") && !v.includes("#")),
  }),
  property_list_view: z.object({ property_ids: z.array(z.string()), list_id: z.string() }),
  property_view: property,
  search: z.object({
    result_count: z.number().int().nonnegative(),
    filter_keys: z.array(z.string()),
  }),
  filter_apply: z.object({ filter_key: z.string(), option_id: z.string().optional() }),
  favorite_add: property,
  favorite_remove: property,
  generate_lead: z.object({
    lead_id: z.string(),
    form_id: z.string(),
    property_id: z.string().optional(),
  }),
  contact_submit: z.object({ lead_id: z.string(), form_id: z.string() }),
  whatsapp_click: property,
  publish_property_start: z.object({ form_id: z.string() }),
  publish_property_submit: z.object({ lead_id: z.string(), form_id: z.string() }),
  schedule_visit: property.extend({ stage: z.literal("opened") }),
  calendly_booking_confirmed: property.extend({
    booking_id: z.string(),
    verified: z.literal(true),
  }),
};
export type AnalyticsEvent = {
  [K in keyof typeof eventPayloads]: {
    event: K;
    event_id: string;
    schema_version: 1;
    payload: z.infer<(typeof eventPayloads)[K]>;
  };
}[keyof typeof eventPayloads];
// No script loading or conversions enabled. The host provides consent state and destination.
export function createAnalytics(push: (event: AnalyticsEvent) => void, consent: () => boolean) {
  const seen = new Set<string>();
  return (event: AnalyticsEvent) => {
    if (!consent() || seen.has(event.event_id)) return false;
    if (event.schema_version !== 1 || !event.event_id) throw new Error("Invalid event envelope");
    const payload = eventPayloads[event.event].parse(event.payload);
    push({ ...event, payload } as AnalyticsEvent);
    seen.add(event.event_id);
    if (seen.size > 1000) seen.delete(seen.values().next().value!);
    return true;
  };
}

// Browser data layer contains only the validated public envelope, never credentials.
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}
export function createBrowserAnalytics(consent: () => boolean) {
  const track = createAnalytics((event) => {
    if (typeof window !== "undefined") (window.dataLayer ??= []).push(event);
  }, consent);
  return (event: Exclude<AnalyticsEvent, { event: "calendly_booking_confirmed" }>) => {
    if (typeof window === "undefined") return false;
    return track(event);
  };
}
