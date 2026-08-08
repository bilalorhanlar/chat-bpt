import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { Gallery } from "@/components/gallery/gallery";
import { PHOTOS } from "@/data/photos";

export const metadata: Metadata = { title: "Galeri" };

export default function GalleryPage() {
  return (
    <PageShell title="Galeri" eyebrow={`${PHOTOS.length} anı`} wide>
      <Gallery />
    </PageShell>
  );
}
