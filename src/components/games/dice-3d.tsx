"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useDiceModel } from "./dice-model";

/**
 * `3d/dice.obj`'den üretilen GLB ile üç boyutlu zar.
 *
 * ### Yüz yönleri
 * Model eksenlere hizalı **değil** — zar Blender'da eğik durumda modellenmiş.
 * Bu yüzden "1 yukarı baksın diye X ekseninde 90° döndür" gibi bir tablo
 * yazmak mümkün olmadı. Aşağıdaki normaller modelin geometrisi ölçülerek
 * bulundu: siyah materyalli noktalar bağlı bileşenlere ayrıldı (tam 21 tane),
 * her bileşenin alan ağırlıklı yüzey normali hesaplandı. Karşıt yüzeyler
 * 1↔6, 2↔5, 3↔4 olarak 7 veriyor — ölçüm bu şekilde doğrulandı.
 *
 * Duruş, bu normali yukarı çeviren dörtlemeyle (quaternion) hesaplanıyor.
 * Başka bir modele geçilirse yalnızca bu tablo yeniden ölçülmeli.
 *
 * ### Performans
 * - Yuvarlanma bitince `frameloop` "demand"e düşüyor: GPU tamamen boşta kalır,
 *   zar ekranda durmaya devam eder.
 * - Fizik motoru yok. Gerçek çarpışma simülasyonu 100+ KB kütüphane ve her
 *   karede hesap demek; yerine hedef duruşa inen yazılı bir takla var.
 * - İki zar aynı geometriyi paylaşıyor, `dpr` en fazla 2.
 */

const FACE_NORMAL: Record<number, [number, number, number]> = {
  1: [0.945, 0.305, -0.119],
  2: [0.217, -0.311, 0.925],
  3: [-0.246, 0.9, 0.36],
  4: [0.246, -0.9, -0.36],
  5: [-0.217, 0.311, -0.925],
  6: [-0.945, -0.305, 0.119],
};

const UP = new THREE.Vector3(0, 1, 0);
const ROLL_MS = 1250;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Verilen değeri yukarı bakacak şekilde döndüren duruş. */
function orientationFor(value: number, yawTurns: number): THREE.Quaternion {
  const normal = new THREE.Vector3(...(FACE_NORMAL[value] ?? FACE_NORMAL[1])).normalize();
  const toUp = new THREE.Quaternion().setFromUnitVectors(normal, UP);
  // Yukarı getirdikten sonra kendi ekseninde çevir — her atış aynı açıyla
  // durup mekanik görünmesin.
  const yaw = new THREE.Quaternion().setFromAxisAngle(UP, yawTurns * Math.PI * 2);
  return yaw.multiply(toUp);
}

type Seed = { axis: [number, number, number]; turns: number; yaw: number };

function Die({
  value,
  offsetX,
  seed,
  rollKey,
  onSettled,
}: {
  value: number;
  offsetX: number;
  seed: Seed;
  rollKey: number;
  onSettled: () => void;
}) {
  const { model, unit } = useDiceModel();
  const group = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const settled = useRef(false);

  const target = useMemo(() => orientationFor(value, seed.yaw), [value, seed.yaw]);
  const axis = useMemo(() => new THREE.Vector3(...seed.axis).normalize(), [seed.axis]);
  const tumble = useMemo(() => new THREE.Quaternion(), []);

  useEffect(() => {
    elapsed.current = 0;
    settled.current = false;
  }, [rollKey]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g || settled.current) return;

    elapsed.current += delta * 1000;
    const t = Math.min(1, elapsed.current / ROLL_MS);
    const e = easeOutCubic(t);

    // Takla açısı tam turlardan sıfıra iner; bitince duruş tam hedefe oturur.
    tumble.setFromAxisAngle(axis, (1 - e) * seed.turns * Math.PI * 2);
    g.quaternion.copy(tumble).multiply(target);
    g.position.set(offsetX, Math.sin(e * Math.PI) * 0.7, 0);

    if (t >= 1) {
      settled.current = true;
      onSettled();
    }
  });

  return (
    <group ref={group} position={[offsetX, 0, 0]}>
      <group scale={unit * 1.5}>
        <primitive object={model} />
      </group>
    </group>
  );
}

export function Dice3D({
  dice,
  rollKey,
  className,
}: {
  dice: [number, number];
  /** Her değiştiğinde yeni bir yuvarlanma başlar. */
  rollKey: number;
  className?: string;
}) {
  const [animating, setAnimating] = useState(true);
  const settledCount = useRef(0);

  const seeds = useMemo<[Seed, Seed]>(() => {
    const rand = () => Math.random() * 2 - 1;
    const make = (): Seed => ({
      axis: [rand(), rand() + 0.4, rand()],
      turns: 2 + Math.floor(Math.random() * 3),
      yaw: Math.random(),
    });
    return [make(), make()];
    // Tohumlar her atışta yenilensin.
  }, [rollKey]);

  useEffect(() => {
    settledCount.current = 0;
    setAnimating(true);
  }, [rollKey]);

  const handleSettled = () => {
    settledCount.current++;
    if (settledCount.current >= 2) setAnimating(false);
  };

  return (
    <div className={className} role="img" aria-label={`Zarlar: ${dice[0]} ve ${dice[1]}`}>
      <Canvas
        dpr={[1, 2]}
        frameloop={animating ? "always" : "demand"}
        camera={{ position: [0, 3.1, 4.4], fov: 32 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 7, 4]} intensity={1.6} />
        <directionalLight position={[-4, 2, -3]} intensity={0.45} color="#C4B5FD" />

        <Die
          value={dice[0]}
          offsetX={-1.05}
          seed={seeds[0]}
          rollKey={rollKey}
          onSettled={handleSettled}
        />
        <Die
          value={dice[1]}
          offsetX={1.05}
          seed={seeds[1]}
          rollKey={rollKey}
          onSettled={handleSettled}
        />
      </Canvas>
    </div>
  );
}
