"use client";

import { useState, type TouchEvent } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function PhotoGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-neutral-100 text-sm text-[#0d0d0d]/50">
        Sin fotos disponibles
      </div>
    );
  }

  function showNext() {
    setActiveIndex((index) => (index + 1) % images.length);
  }

  function showPrev() {
    setActiveIndex((index) => (index - 1 + images.length) % images.length);
  }

  function handleTouchStart(event: TouchEvent) {
    setTouchStartX(event.touches[0].clientX);
  }

  function handleTouchEnd(event: TouchEvent) {
    if (touchStartX === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        showNext();
      } else {
        showPrev();
      }
    }
    setTouchStartX(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-100"
      >
        <Image src={images[activeIndex]} alt={alt} fill className="object-contain" />
      </button>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative aspect-square size-20 shrink-0 overflow-hidden rounded-md ring-2",
                index === activeIndex ? "ring-[#0d0d0d]" : "ring-transparent"
              )}
            >
              <Image src={url} alt={alt} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="w-screen max-w-none rounded-none border-none bg-black/95 p-0 sm:max-w-none h-screen">
          <div
            className="relative flex h-full w-full items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <Image
              src={images[activeIndex]}
              alt={alt}
              fill
              className="object-contain"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPrev}
                  aria-label="Foto anterior"
                  className="absolute top-1/2 left-4 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  aria-label="Foto siguiente"
                  className="absolute top-1/2 right-4 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
