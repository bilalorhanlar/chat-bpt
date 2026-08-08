"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export const DICE_MODEL = "/3d/dice.glb";

/**
 * Zar modelini kullanıma hazır hâle getirir.
 *
 * Blender'dan gelen model ne orijinde duruyor ne de birim küp boyutunda; ham
 * hâliyle sahneye koyunca kadraj dışında kalıyor. Burada sınır kutusundan
 * merkez ve boyut ölçülüp model kendi merkezine taşınıyor, ölçek de 1 birime
 * normalize ediliyor — böylece kamera ayarları modelden bağımsız oluyor.
 *
 * Materyaller: model "black" ve "white" olmak üzere iki materyal taşıyor.
 * Gövde açık olan, noktalar koyu olan. Koyu materyali mora çevirince beyaz
 * gövdeli, mor noktalı bir zar çıkıyor — sitenin temasıyla birebir.
 */
export function useDiceModel() {
  const { scene } = useGLTF(DICE_MODEL);

  return useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const source = child.material as THREE.MeshStandardMaterial;
      const material = source.clone();
      const isDark = material.color.r < 0.25;
      material.color = new THREE.Color(isDark ? "#7C3AED" : "#FDFDFF");
      material.roughness = isDark ? 0.4 : 0.55;
      material.metalness = 0.04;
      child.material = material;
      child.castShadow = false;
      child.receiveShadow = false;
    });

    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z) || 1;

    // Modeli kendi merkezine kaydır; dış grup ölçeklenince bu kayma da ölçeklenir.
    clone.position.set(-center.x, -center.y, -center.z);

    return { model: clone, unit: 1 / maxDimension };
  }, [scene]);
}

useGLTF.preload(DICE_MODEL);
