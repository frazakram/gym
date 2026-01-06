export function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(String(url).trim());
    const host = u.hostname.toLowerCase();

    // youtu.be/<id>
    if (host.includes("youtu.be")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const id = (parts[0] || "").trim();
      return isValidYouTubeVideoId(id) ? id : null;
    }

    if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
      // watch?v=<id>
      const v = u.searchParams.get("v");
      if (v && isValidYouTubeVideoId(v)) return v;

      const parts = u.pathname.split("/").filter(Boolean);

      // /shorts/<id>
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx !== -1 && parts[shortsIdx + 1] && isValidYouTubeVideoId(parts[shortsIdx + 1])) {
        return parts[shortsIdx + 1];
      }

      // /embed/<id>
      const embedIdx = parts.indexOf("embed");
      if (embedIdx !== -1 && parts[embedIdx + 1] && isValidYouTubeVideoId(parts[embedIdx + 1])) {
        return parts[embedIdx + 1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function isValidYouTubeVideoId(id: string): boolean {
  // YouTube video IDs are 11 chars: letters, numbers, _ and -
  return /^[A-Za-z0-9_-]{11}$/.test(String(id || "").trim());
}

export function isYouTubeUrl(url: string): boolean {
  const id = getYouTubeId(url);
  if (!id) return false;
  try {
    const u = new URL(String(url).trim());
    const host = u.hostname.toLowerCase();
    return (
      host.includes("youtu.be") ||
      host.includes("youtube.com") ||
      host.includes("youtube-nocookie.com")
    );
  } catch {
    return false;
  }
}

export function canonicalYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export function youTubeThumbnailUrl(videoId: string, quality: "hqdefault" | "mqdefault" = "hqdefault"): string {
  return `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/${quality}.jpg`;
}

export function sanitizeYouTubeUrls(input: unknown, max = 3): string[] {
  const raw = Array.isArray(input) ? input : typeof input === "string" ? [input] : [];

  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const id = getYouTubeId(trimmed);
    if (!id) continue;
    ids.push(id);
  }

  // Dedup while preserving order
  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    uniq.push(id);
    if (uniq.length >= max) break;
  }

  return uniq.map(canonicalYouTubeWatchUrl);
}


