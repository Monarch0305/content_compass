// Small coloured label that shows which platform an item came from.

import type { Platform } from "@/lib/types";
import { platformLabel } from "@/lib/platform";

const styles: Record<Platform, string> = {
  youtube: "bg-red-500/10 text-red-700",
  short: "bg-pink-500/10 text-pink-700",
  reel: "bg-fuchsia-500/10 text-fuchsia-700",
};

export function PlatformTag({ platform }: { platform: Platform }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[platform]}`}
    >
      {platformLabel(platform)}
    </span>
  );
}
