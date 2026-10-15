/**
 * The colour of light at a colour temperature, in kelvin: a black body's
 * glow, after Tanner Helland's fit to Mitchell Charity's table, good from
 * 1000 K to 40,000 K. Candlelight is about 1900 K, a sodium or warm
 * halide lamp 2700-3500 K, a metal halide high-bay about 4000 K, noon sun
 * 5500 K and an overcast sky 6500-7500 K.
 *
 * Returns red, green and blue, each 0 to 1, in sRGB.
 */
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const t = Math.max(1000, Math.min(40000, kelvin)) / 100;
  const clamp = (v: number) => Math.max(0, Math.min(255, v)) / 255;
  const red = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const green =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * (t - 60) ** -0.0755148492;
  const blue =
    t >= 66
      ? 255
      : t <= 19
        ? 0
        : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [clamp(red), clamp(green), clamp(blue)];
}

/** The same, as a CSS colour, `#rrggbb`. */
export function kelvinToHex(kelvin: number) {
  return (
    '#' +
    kelvinToRgb(kelvin)
      .map((c) =>
        Math.round(c * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
