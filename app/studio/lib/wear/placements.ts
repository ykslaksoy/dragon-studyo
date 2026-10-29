/** Wear placement quads — ported from research PR #10 wear_placements.json (v3). */

export type Point = [number, number];

export type PlacementCfg = {
  allow_auto_quad?: boolean;
  cover_polygons: Point[][];
  dst_quad: Point[];
  occlusion_polygons: Point[][];
  color_temp_shift?: [number, number, number];
};

export type StockPlacements = {
  size: [number, number];
} & Record<string, PlacementCfg | [number, number]>;

export const WEAR_PLACEMENTS: Record<string, StockPlacements> = {
  fitness_worn_gear: {
    size: [1400, 933],
    shoe_worn: {
      allow_auto_quad: true,
      cover_polygons: [],
      dst_quad: [
        [70, 513],
        [297, 513],
        [297, 792],
        [70, 792],
      ],
      occlusion_polygons: [
        [
          [62, 498],
          [305, 498],
          [298, 548],
          [68, 548],
        ],
      ],
      color_temp_shift: [1.04, 1.0, 0.96],
    },
    watch_worn: {
      allow_auto_quad: false,
      cover_polygons: [
        [
          [388, 158],
          [468, 142],
          [482, 208],
          [402, 224],
        ],
      ],
      dst_quad: [
        [395, 165],
        [460, 152],
        [472, 202],
        [408, 215],
      ],
      occlusion_polygons: [
        [
          [518, 268],
          [578, 258],
          [586, 302],
          [526, 312],
        ],
      ],
      color_temp_shift: [0.88, 0.9, 0.92],
    },
  },
  hand_beauty: {
    size: [1400, 933],
    product_in_hand: {
      allow_auto_quad: false,
      cover_polygons: [
        [
          [53, 533],
          [953, 305],
          [1018, 559],
          [117, 787],
        ],
      ],
      dst_quad: [
        [53, 533],
        [953, 305],
        [1018, 559],
        [117, 787],
      ],
      occlusion_polygons: [
        [
          [680, 420],
          [760, 400],
          [775, 480],
          [695, 500],
        ],
        [
          [900, 380],
          [980, 360],
          [995, 450],
          [915, 470],
        ],
      ],
      color_temp_shift: [1.08, 1.02, 0.92],
    },
    perfume_in_hand: {
      allow_auto_quad: false,
      cover_polygons: [
        [
          [53, 533],
          [953, 305],
          [1018, 559],
          [117, 787],
        ],
      ],
      dst_quad: [
        [60, 520],
        [945, 298],
        [1010, 552],
        [125, 775],
      ],
      occlusion_polygons: [
        [
          [670, 410],
          [755, 390],
          [770, 475],
          [685, 495],
        ],
        [
          [895, 370],
          [975, 350],
          [990, 445],
          [910, 465],
        ],
      ],
      color_temp_shift: [1.05, 1.0, 0.94],
    },
  },
  fashion_model_studio: {
    size: [1400, 1938],
    dress_worn: {
      allow_auto_quad: false,
      cover_polygons: [
        [
          [420, 520],
          [980, 500],
          [1020, 1680],
          [380, 1700],
        ],
      ],
      dst_quad: [
        [430, 540],
        [970, 520],
        [1005, 1650],
        [395, 1675],
      ],
      occlusion_polygons: [
        [
          [520, 470],
          [880, 455],
          [895, 720],
          [505, 740],
        ],
        [
          [455, 720],
          [545, 710],
          [560, 820],
          [465, 835],
        ],
        [
          [855, 715],
          [945, 705],
          [960, 815],
          [870, 828],
        ],
      ],
      color_temp_shift: [1.05, 1.02, 0.98],
    },
  },
};

export type WearJob = {
  stockId: keyof typeof WEAR_PLACEMENTS | string;
  placementKey: string;
  stockUrl: string;
};

/** Map frame labels → occlusion-warp wear job (free path; not photoreal VTON). */
export function wearJobForFrame(baseFrame: string): WearJob | null {
  const b = baseFrame.toLowerCase();
  if (
    b.includes("elde") ||
    b.includes("product_in_hand") ||
    b.includes("ürün reveal")
  ) {
    return {
      stockId: "hand_beauty",
      placementKey: "product_in_hand",
      stockUrl: "/mannequin/hand_beauty.jpg",
    };
  }
  if (b.includes("ugc") || b.includes("lifestyle") || b.includes("stok hissi")) {
    return {
      stockId: "fitness_worn_gear",
      placementKey: "shoe_worn",
      stockUrl: "/mannequin/fitness_worn_gear.jpg",
    };
  }
  if (b.includes("editorial portrait") || b.includes("mannequin") || b.includes("giyili")) {
    return {
      stockId: "fashion_model_studio",
      placementKey: "dress_worn",
      stockUrl: "/mannequin/fashion_model_studio.jpg",
    };
  }
  return null;
}
