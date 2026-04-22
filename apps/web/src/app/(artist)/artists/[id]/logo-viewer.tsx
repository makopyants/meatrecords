"use client";

import { useState } from "react";

interface Props {
  imageUrl: string;
  artistName: string;
}

export function LogoViewer({ imageUrl, artistName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="relative w-16 h-16 rounded-lg bg-muted border overflow-hidden shrink-0 group focus:outline-none"
        onClick={() => setOpen(true)}
        title="Увеличить логотип"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Логотип" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-lg">🔍</span>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm"
              onClick={() => setOpen(false)}
            >
              Закрыть ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Логотип ${artistName}`}
              className="w-full rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
