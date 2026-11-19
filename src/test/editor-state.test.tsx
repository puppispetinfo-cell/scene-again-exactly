import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import type { ContentRecord } from "@/platform/contracts";
const { save } = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/platform/admin-functions", () => ({
  adminSave: save,
  adminPublish: vi.fn(),
  adminHistory: vi.fn(),
}));
import { useDocument } from "@/admin/use-document";
const record: ContentRecord = {
  id: "10000000-0000-4000-8000-000000000001",
  kind: "page",
  slug: "test",
  document: { title: "Initial" },
  revision: 0,
  status: "draft",
  updated_at: "2026-11-19T00:00:00Z",
};
beforeEach(() => save.mockReset());
describe("editor error recovery", () => {
  it("lets an editor correct invalid content and save again", async () => {
    save
      .mockRejectedValueOnce(new Error("Revisá el título. No se guardaron los cambios."))
      .mockResolvedValueOnce({ revision: 1 });
    const { result, unmount } = renderHook(() => useDocument(record, { title: "Initial" }));
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.error).toContain("Revisá");
    act(() => result.current.setDocument({ title: "Corrected" }));
    await act(async () => {
      await result.current.save();
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.revision).toBe(1);
    expect(result.current.error).toBe("");
    unmount();
  });
  it("does not silently retry a concurrency conflict", async () => {
    save.mockRejectedValueOnce(new Error("Otra persona modificó este contenido."));
    const { result, unmount } = renderHook(() => useDocument(record, { title: "Initial" }));
    await act(async () => {
      await result.current.save();
    });
    act(() => result.current.setDocument({ title: "My preserved changes" }));
    await act(async () => {
      await result.current.save();
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.document.title).toBe("My preserved changes");
    unmount();
  });
});
