/**
 * Sayfanın arkasındaki mor ışık bulutları.
 *
 * Bilerek `filter: blur()` KULLANMIYOR. Yumuşaklık radial-gradient'in kendi
 * geçişinden geliyor; blur'lu bir katmanı transform ile hareket ettirmek
 * bazı tarayıcılarda her karede yeniden rasterleştirme tetikliyor ve mobilde
 * kare düşürüyor. Gradyan zaten bulanık göründüğü için filtreye gerek yok.
 *
 * Üçüncü bulut yalnızca geniş ekranlarda çizilir — telefonda iki katman yeter.
 */

type Blob = {
  className: string;
  color: string;
  animation: string;
};

const BLOBS: Blob[] = [
  {
    className: "-left-[22%] -top-[18%] h-[42rem] w-[42rem] sm:h-[54rem] sm:w-[54rem]",
    color: "rgb(167 139 250 / 0.40)",
    animation: "aurora-a 28s var(--ease-in-out-soft) infinite",
  },
  {
    className: "-right-[26%] top-[24%] h-[38rem] w-[38rem] sm:h-[50rem] sm:w-[50rem]",
    color: "rgb(232 121 249 / 0.24)",
    animation: "aurora-b 34s var(--ease-in-out-soft) infinite",
  },
  {
    className: "hidden sm:block left-[18%] bottom-[-24%] h-[46rem] w-[46rem]",
    color: "rgb(124 58 237 / 0.20)",
    animation: "aurora-c 40s var(--ease-in-out-soft) infinite",
  },
];

export function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-20 overflow-hidden bg-canvas"
    >
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          className={`gpu absolute rounded-full ${blob.className}`}
          style={{
            background: `radial-gradient(circle at center, ${blob.color} 0%, rgb(255 255 255 / 0) 66%)`,
            animation: blob.animation,
          }}
        />
      ))}
      {/* Üstten aşağı çok hafif beyaz yıkama: içeriğin okunurluğunu korur. */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/20 to-white/65" />
    </div>
  );
}
