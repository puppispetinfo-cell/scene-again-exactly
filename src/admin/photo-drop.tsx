import { beginImageUpload, finishImageUpload } from "@/platform/media-functions";
import { adminMedia } from "@/platform/admin-functions";
import { useEffect, useRef, useState } from "react";
import { Upload, GripVertical, X, RotateCcw } from "lucide-react";
import type { z } from "@/lib/validation";
import { mediaSchema } from "@/platform/contracts";
type Media = z.infer<typeof mediaSchema>;
interface Pending {
  key: string;
  file: File;
  preview: string;
  progress: number;
  error: string;
}
export function PhotoDrop({
  images,
  onChange,
  single = false,
}: {
  images: Media[];
  onChange: (images: Media[]) => void;
  single?: boolean;
}) {
  const [library, setLibrary] = useState<Media[] | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [over, setOver] = useState(false);
  const drag = useRef<number | null>(null);
  const files = useRef<HTMLInputElement>(null);
  const current = useRef(images);
  current.current = images;
  const urls = useRef(new Set<string>());
  const requests = useRef(new Set<XMLHttpRequest>());
  const alive = useRef(true);
  const queue = useRef<Pending[]>([]),
    active = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      queue.current = [];
      for (const url of urls.current) URL.revokeObjectURL(url);
      for (const xhr of requests.current) xhr.abort();
    };
  }, []);
  const patch = (key: string, change: Partial<Pending>) =>
    setPending((p) => p.map((item) => (item.key === key ? { ...item, ...change } : item)));
  const send = async (item: Pending) => {
    if (!alive.current) return;
    patch(item.key, { error: "", progress: 0 });
    try {
      const target = await beginImageUpload({
        data: { type: item.file.type as "image/jpeg", size: item.file.size },
      });
      if (!alive.current) return;
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        requests.current.add(xhr);
        xhr.open("PUT", target.signedUrl);
        xhr.setRequestHeader("Content-Type", item.file.type);
        xhr.setRequestHeader("x-upsert", "false");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            patch(item.key, { progress: Math.round((e.loaded / e.total) * 90) });
        };
        xhr.onload = () => {
          requests.current.delete(xhr);
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error("No se pudo subir la foto. Podés reintentar."));
        };
        xhr.onabort = () => reject(new Error("Carga cancelada."));
        xhr.onerror = () => {
          requests.current.delete(xhr);
          reject(new Error("Se interrumpió la conexión. Podés reintentar."));
        };
        xhr.send(item.file);
      });
      patch(item.key, { progress: 95 });
      const image = mediaSchema.parse(
        await finishImageUpload({
          data: { path: target.path, alt: item.file.name.replace(/\.[^.]+$/, "").slice(0, 1000) },
        }),
      );
      if (!alive.current) return;
      const next = single ? [image] : [...current.current, image];
      current.current = next;
      onChange(next);
      URL.revokeObjectURL(item.preview);
      urls.current.delete(item.preview);
      setPending((p) => p.filter((x) => x.key !== item.key));
    } catch (error) {
      patch(item.key, {
        error: error instanceof Error ? error.message : "No se pudo procesar la foto.",
      });
    }
  };
  const pump = () => {
    while (active.current < 2 && queue.current.length) {
      const next = queue.current.shift()!;
      active.current++;
      void send(next).finally(() => {
        active.current--;
        pump();
      });
    }
  };
  const enqueue = (item: Pending) => {
    queue.current.push(item);
    pump();
  };
  const add = (list: FileList | File[]) => {
    const selected = [...list].slice(
      0,
      single ? 1 : Math.max(0, 60 - images.length - pending.length),
    );
    for (const file of selected) {
      const key = crypto.randomUUID(),
        preview = URL.createObjectURL(file);
      urls.current.add(preview);
      const error = !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)
        ? "Elegí una foto JPG, PNG, WebP o AVIF."
        : file.size > 10485760
          ? "La foto supera los 10 MB."
          : "";
      const item = { key, file, preview, progress: 0, error };
      setPending((p) => [...p, item]);
      if (!error) enqueue(item);
    }
  };
  const move = (from: number, to: number) => {
    const next = [...images];
    const item = next.splice(from, 1)[0];
    if (item) {
      next.splice(to, 0, item);
      onChange(next);
    }
  };
  return (
    <div>
      <div
        className={`admin-drop ${over ? "is-over" : ""}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) add(e.dataTransfer.files);
        }}
      >
        <Upload size={26} />
        <p>Arrastrá {single ? "una fotografía" : "las fotografías"} acá</p>
        <button type="button" className="admin-secondary" onClick={() => files.current?.click()}>
          Elegir {single ? "foto" : "fotos"}
        </button>
        <span>JPG, PNG, WebP o AVIF · hasta 10 MB por foto</span>
        <input
          ref={files}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple={!single}
          onChange={(e) => {
            if (e.target.files) add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <button
        type="button"
        className="admin-link"
        onClick={async () => {
          try {
            setLibrary(await adminMedia({ data: 0 }));
          } catch {
            setLibrary([]);
          }
        }}
      >
        Usar una foto existente
      </button>
      {library && (
        <section aria-label="Fotos disponibles" className="admin-card">
          <div className="admin-photo-controls">
            <h3>Fotos disponibles</h3>
            <button type="button" onClick={() => setLibrary(null)}>
              Cerrar
            </button>
          </div>
          <div className="admin-photos">
            {library.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => {
                  onChange(
                    single
                      ? [image]
                      : images.some((i) => i.id === image.id)
                        ? images
                        : [...images, image],
                  );
                  setLibrary(null);
                }}
              >
                <img src={image.src} alt={image.alt} />
                <span>{image.alt || "Fotografía"}</span>
              </button>
            ))}
          </div>
          {!library.length && <p>No hay fotos disponibles o no se pudieron cargar.</p>}
        </section>
      )}
      <div className="admin-photos">
        {images.map((image, i) => (
          <article
            key={image.id}
            draggable
            onDragStart={() => (drag.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (drag.current !== null) move(drag.current, i);
              drag.current = null;
            }}
          >
            <img src={image.src} alt={image.alt} />
            <div className="admin-photo-controls">
              <GripVertical size={16} />
              <span>{i === 0 ? "Principal" : `Foto ${i + 1}`}</span>
              <button
                type="button"
                aria-label={`Quitar foto ${i + 1}`}
                onClick={() => onChange(images.filter((_, n) => n !== i))}
              >
                <X size={16} />
              </button>
            </div>
            <input
              aria-label={`Descripción de foto ${i + 1}`}
              value={image.alt}
              placeholder="Descripción de la foto"
              onChange={(e) =>
                onChange(images.map((m, n) => (n === i ? { ...m, alt: e.target.value } : m)))
              }
            />
            <div className="admin-photo-controls">
              <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)}>
                ← Mover
              </button>
              <button
                type="button"
                disabled={i === images.length - 1}
                onClick={() => move(i, i + 1)}
              >
                Mover →
              </button>
              {i > 0 && (
                <button type="button" onClick={() => move(i, 0)}>
                  Principal
                </button>
              )}
            </div>
          </article>
        ))}
        {pending.map((item) => (
          <article key={item.key}>
            <img src={item.preview} alt="Foto pendiente" />
            <progress max={100} value={item.progress} />
            {item.error && (
              <button
                type="button"
                className="admin-link"
                onClick={() => {
                  URL.revokeObjectURL(item.preview);
                  urls.current.delete(item.preview);
                  setPending((p) => p.filter((v) => v.key !== item.key));
                }}
              >
                Quitar
              </button>
            )}
            <p role={item.error ? "alert" : undefined}>
              {item.error ||
                (item.progress >= 95 ? "Procesando fotografía…" : `Subiendo ${item.progress}%`)}
            </p>
            {item.error &&
              ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(item.file.type) &&
              item.file.size <= 10485760 && (
                <button type="button" className="admin-secondary" onClick={() => enqueue(item)}>
                  <RotateCcw size={14} />
                  Reintentar
                </button>
              )}
          </article>
        ))}
      </div>
    </div>
  );
}
