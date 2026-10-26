"use client";
import { useEffect, useRef, type ImgHTMLAttributes } from "react";

export function BlobImage({ blob, alt, ...props }: { blob: Blob } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const target = ref.current;
    let disposed = false, settled = false, url: string | undefined;
    // Strict Mode can dispose an effect before the browser starts loading its Blob URL.
    queueMicrotask(() => {
      if (disposed || !target) return;
      url = URL.createObjectURL(blob); target.src = url;
      void target.decode().catch(() => {}).finally(() => {
        settled = true;
        if (disposed && url) URL.revokeObjectURL(url);
      });
    });
    return () => {
      disposed = true;
      if (url && target?.getAttribute("src") === url) target.removeAttribute("src");
      if (url && settled) URL.revokeObjectURL(url);
    };
  }, [blob]);
  return <img ref={ref} alt={alt} {...props} />;
}
