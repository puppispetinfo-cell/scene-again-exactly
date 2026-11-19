import { createContext, useContext, type CSSProperties } from "react";
import type { Element } from "@/platform/contracts";
import { useElement } from "@/platform/content-context";
export function EditableText({
  page,
  id,
  field,
  fallback,
}: {
  page: string;
  id: string;
  field: "title" | "subtitle" | "body";
  fallback: string;
}) {
  const e = useElement(page, id);
  if (!e) return <>{fallback}</>;
  const desktop = e.desktop[field] ?? e[field],
    mobile = e.mobile[field] ?? e[field];
  return desktop === mobile ? (
    <>{desktop}</>
  ) : (
    <>
      <span className="editable-desktop">{desktop}</span>
      <span className="editable-mobile">{mobile}</span>
    </>
  );
}
export function EditableImage({
  page,
  id,
  fallback,
  alt,
  className,
  priority = false,
  width,
  height,
}: {
  page: string;
  id: string;
  fallback: string;
  alt: string;
  className: string;
  priority?: boolean;
  width?: number;
  height?: number;
}) {
  const e = useElement(page, id);
  const image = e?.desktop.image ?? e?.image;
  const mobile = e?.mobile.image ?? e?.image;
  const style = {
    ...(e?.desktop.focalX !== undefined ? { "--image-desktop-x": `${e.desktop.focalX}%` } : {}),
    ...(e?.desktop.focalY !== undefined ? { "--image-desktop-y": `${e.desktop.focalY}%` } : {}),
    ...(e?.mobile.focalX !== undefined ? { "--image-mobile-x": `${e.mobile.focalX}%` } : {}),
    ...(e?.mobile.focalY !== undefined ? { "--image-mobile-y": `${e.mobile.focalY}%` } : {}),
  } as CSSProperties;
  return (
    <picture style={{ display: "contents" }}>
      {mobile && <source media="(max-width:767px)" srcSet={mobile.src} />}
      <img
        src={image?.src ?? fallback}
        alt={image?.alt ?? alt}
        width={image?.width ?? width}
        height={image?.height ?? height}
        className={`${className} editable-image`}
        data-parallax={className.includes("parallax-image") ? true : undefined}
        style={style}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}
export function editableVisibility(e: Element | undefined) {
  return e?.visible === false ? { hidden: true } : {};
}
