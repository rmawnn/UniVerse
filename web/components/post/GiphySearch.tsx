"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Search, X } from "lucide-react";

const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
const LIMIT = 20;

interface GiphyImage {
  id: string;
  title: string;
  images: {
    fixed_height: { url: string; width: string; height: string };
    fixed_width_small: { url: string; width: string; height: string };
    original: { url: string };
  };
}

interface GiphySearchProps {
  onSelect: (url: string, previewUrl: string) => void;
  onClose: () => void;
}

export function GiphySearch({ onSelect, onClose }: GiphySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiphyImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState<GiphyImage[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!API_KEY) return;
    setLoading(true);
    fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=${LIMIT}&rating=pg-13`)
      .then((r) => r.json())
      .then((d) => { setTrending(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const search = useCallback((q: string) => {
    if (!API_KEY || !q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    fetch(`https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=${LIMIT}&rating=pg-13`)
      .then((r) => r.json())
      .then((d) => { setResults(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  }

  const gifs = query.trim() ? results : trending;

  if (!API_KEY) {
    return (
      <div className="mt-3 rounded-lg border border-line-2 bg-bg-3 p-4 text-[13px] text-fg-3">
        GIPHY API key not configured. Add NEXT_PUBLIC_GIPHY_API_KEY to your environment.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-line-2 bg-bg-3 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-fg-1">
          <img src="https://media.giphy.com/static/img/giphy_logo_square.png" alt="GIPHY" className="h-5 w-5 rounded" />
          Search GIFs
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-fg-4 hover:bg-bg-4 hover:text-fg-2"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative mt-2.5">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-4" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Search GIPHY..."
          className="w-full rounded-md border border-line-2 bg-bg-1 py-2 pl-8 pr-3 text-[14px] text-fg-1 placeholder:text-fg-4 focus:border-brand-purple/60 focus:outline-none"
        />
      </div>

      <div className="mt-2.5 max-h-[240px] overflow-y-auto rounded-md">
        {loading && gifs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-fg-3" />
          </div>
        ) : gifs.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-fg-4">
            {query.trim() ? "No GIFs found" : "Start typing to search"}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => onSelect(gif.images.original.url, gif.images.fixed_height.url)}
                className="group relative overflow-hidden rounded-md border border-transparent hover:border-brand-purple"
              >
                <img
                  src={gif.images.fixed_width_small.url}
                  alt={gif.title}
                  loading="lazy"
                  className="h-[80px] w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-[10px] text-fg-4">
        Powered by GIPHY
      </p>
    </div>
  );
}
