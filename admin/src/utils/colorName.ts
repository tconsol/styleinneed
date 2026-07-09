// Nearest human-friendly colour name for an arbitrary hex value.
const NAMED: [string, [number, number, number]][] = [
  ['Black', [0, 0, 0]], ['White', [255, 255, 255]], ['Grey', [128, 128, 128]],
  ['Silver', [192, 192, 192]], ['Red', [220, 20, 60]], ['Maroon', [128, 0, 0]],
  ['Pink', [255, 192, 203]], ['Rose', [216, 167, 177]], ['Orange', [255, 140, 0]],
  ['Gold', [200, 169, 126]], ['Yellow', [240, 200, 50]], ['Olive', [128, 128, 0]],
  ['Green', [34, 139, 34]], ['Teal', [0, 128, 128]], ['Cyan', [0, 200, 200]],
  ['Blue', [37, 99, 235]], ['Navy', [0, 0, 128]], ['Sky Blue', [135, 206, 235]],
  ['Purple', [128, 0, 128]], ['Violet', [138, 43, 226]], ['Lavender', [200, 180, 230]],
  ['Magenta', [255, 0, 255]], ['Brown', [139, 69, 19]], ['Beige', [212, 165, 124]],
  ['Tan', [210, 180, 140]], ['Cream', [245, 239, 232]], ['Indigo', [75, 0, 130]],
];

export const isHex = (v?: string): boolean => !!v && /^#[0-9a-fA-F]{6}$/.test(v);

export const colorNameFromHex = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  let best = NAMED[0][0];
  let min = Infinity;
  for (const [name, [nr, ng, nb]] of NAMED) {
    const d = (r - nr) ** 2 + (g - ng) ** 2 + (b - nb) ** 2;
    if (d < min) { min = d; best = name; }
  }
  return best;
};
