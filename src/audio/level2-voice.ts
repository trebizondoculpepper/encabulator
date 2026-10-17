import lines from './assets/narration/level2/lines.json';

const recordings = import.meta.glob('./assets/narration/level2/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const byText = new Map(Object.entries(lines).map(([key, text]) => [text, key]));

/** One recorded voice for both scripted cues and the finite card-name variants. */
export function createLevel2Voice() {
  let pending: { id: number; key: string }[] = [];
  let current: HTMLAudioElement | null = null;
  let onStart: (id: number) => void = () => {};
  let timer = 0;
  let enabled = true;

  const stop = () => {
    window.clearTimeout(timer);
    if (current) {
      current.pause();
      current.removeAttribute('src');
      current.load();
      current = null;
    }
  };
  const next = () => {
    if (!enabled || current || !pending.length) return;
    const line = pending.shift()!;
    const url = recordings[`./assets/narration/level2/${line.key}.mp3`];
    if (!url) throw new Error(`Missing Level 2 narration: ${line.key}`);
    const audio = new Audio(url);
    audio.volume = 0.9;
    current = audio;
    audio.onplaying = () => onStart(line.id);
    audio.onended = audio.onerror = () => {
      if (current !== audio) return;
      current = null;
      timer = window.setTimeout(next, 850);
    };
    void audio.play().catch(() => {
      if (current === audio) {
        current = null;
        pending.unshift(line);
      }
    });
  };
  return {
    queue(...indices: number[]) {
      pending.push(
        ...indices.map((id) => ({
          id,
          key: `cue_${String(id).padStart(3, '0')}`,
        })),
      );
      next();
    },
    interrupt(...indices: number[]) {
      stop();
      pending = [];
      this.queue(...indices);
    },
    say(text: string) {
      const key = byText.get(text);
      if (!key) throw new Error(`Unrecorded Level 2 narration: ${text}`);
      pending.push({ id: 0, key });
      next();
    },
    onStart(handler: (id: number) => void) {
      onStart = handler;
    },
    get busy() {
      return Boolean(current || pending.length);
    },
    resume() {
      enabled = true;
      if (current) void current.play();
      else next();
    },
    suspend() {
      enabled = false;
      current?.pause();
    },
    dispose() {
      enabled = false;
      pending = [];
      stop();
    },
  };
}
