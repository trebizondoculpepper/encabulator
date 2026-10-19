/** Each stock position starts a fresh timer only when its displayed spare is taken. */
export function createSparesStock<T>(
  make: (index: number) => T,
  count: number,
) {
  const places = Array.from({ length: count }, (_, i) => ({
    item: make(i),
    remaining: null as number | null,
  }));
  return {
    places,
    taken(item: T) {
      const place = places.find((p) => p.item === item);
      if (place && place.remaining === null) place.remaining = 60;
    },
    update(delta: number) {
      places.forEach((place, i) => {
        if (place.remaining === null) return;
        place.remaining -= delta;
        if (place.remaining > 1e-8) return;
        place.item = make(i);
        place.remaining = null;
      });
    },
  };
}
