import { STAGE_NAMES, projectStage } from '../game/dimensionality';
import { DIMENSION_CONDITIONS } from '../game/dimensionality';
import type { DimensionConditions } from '../game/dimensionality';

/**
 * Level 0's own LCD pictures, drawn live on the line-up's LCD monitors
 * (`setPicture` on `createLcdMonitor`): the ENCABULATOR SYSTEMS display's
 * Dimensionality mode, the drive's process mimic and the dingle arm's
 * event log. Each draws on a 320 × 240 canvas at about twelve frames a
 * second; the most it draws is the 192 edges of a six-cube.
 */

const FONT = '"Courier New", monospace';

const CONDITION_LABELS: Record<keyof DimensionConditions, string> = {
  control: 'CONTROL UNIT BOOTED',
  automation: 'AUTOMATION RUNNING',
  drive: 'DRIVE >= 40% + LUBE',
  phase: 'PHASE LOCK + ANALOG',
  flow: 'HYDRO FLOW + FAN',
  arm: 'DINGLE ARM STROKING',
};

export interface DimensionReading {
  progress: number;
  achieved: number;
  allowed: number;
  coherence: number;
  conditions: DimensionConditions;
}

export function drawDimensionality(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  seconds: number,
  reading: DimensionReading,
) {
  const { progress, achieved, allowed, coherence, conditions } = reading;
  c.fillStyle = '#02060f';
  c.fillRect(0, 0, w, h);
  const ink = '#7fd8ff';
  c.font = `bold 14px ${FONT}`;
  c.fillStyle = ink;
  c.fillText('DIMENSIONALITY', 8, 17);
  const state =
    progress < allowed - 1e-6
      ? 'BUILDING'
      : progress > allowed + 1e-6
        ? 'COLLAPSING'
        : achieved === 0
          ? 'STANDBY'
          : 'STABLE';
  c.fillText(state, w - 8 - c.measureText(state).width, 17);
  // The figure, in a square on the left, shaking as coherence is lost.
  const cx = 104;
  const cy = 128;
  const r = 84;
  c.strokeStyle = '#0f2a44';
  c.strokeRect(cx - r - 6, cy - r - 6, 2 * r + 12, 2 * r + 12);
  if (progress > 0) {
    const { edges } = projectStage(progress, seconds * 0.6);
    const shake = (1 - coherence) * 6;
    const jitter = (k: number) =>
      shake * Math.sin(seconds * 23 + k * 12.9898) * Math.cos(k * 4.1);
    c.strokeStyle = coherence > 0.75 ? '#9fe8ff' : '#ffd36b';
    c.lineWidth = progress < 1.5 ? 3 : 1.4;
    c.beginPath();
    edges.forEach(([a, b], k) => {
      c.moveTo(cx + a[0] * r + jitter(k), cy + a[1] * r + jitter(k + 1));
      c.lineTo(cx + b[0] * r + jitter(k + 2), cy + b[1] * r + jitter(k + 3));
    });
    c.stroke();
  } else {
    c.fillStyle = '#3b5d7a';
    c.font = `13px ${FONT}`;
    c.fillText('NO DIMENSION', cx - 46, cy + 4);
  }
  // The readout, on the right.
  const x = 206;
  c.font = `bold 34px ${FONT}`;
  c.fillStyle = ink;
  c.fillText(`${achieved}D`, x, 64);
  c.font = `bold 13px ${FONT}`;
  c.fillText(STAGE_NAMES[achieved], x, 82);
  c.font = `12px ${FONT}`;
  c.fillStyle = '#b8e9ff';
  c.fillText(`ALLOW ${allowed}D`, x, 102);
  c.fillText(`COH ${(coherence * 100).toFixed(0)}%`, x, 118);
  // The conditions, one line each, down the right side.
  c.font = `10px ${FONT}`;
  DIMENSION_CONDITIONS.forEach((key, i) => {
    const met = conditions[key];
    c.fillStyle = met ? '#6cff9a' : '#ff7a6b';
    c.fillText(
      `${i + 1}${met ? '+' : '-'} ${CONDITION_LABELS[key].slice(0, 16)}`,
      198,
      142 + i * 15,
    );
  });
}

export interface DriveReading {
  hz: number;
  setpoint: number;
  amps: number;
  heatsink: number;
  local: boolean;
  reverse: boolean;
  block: string | null;
  oilOk: boolean;
  isolator: boolean;
  cooling: boolean;
}

export function drawDriveMimic(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  _seconds: number,
  d: DriveReading,
) {
  c.fillStyle = '#05070f';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#1d3a8a';
  c.fillRect(0, 0, w, 22);
  c.font = `bold 14px ${FONT}`;
  c.fillStyle = '#ffffff';
  c.fillText('VFD-601 MAIN DRIVE', 8, 16);
  c.fillText(d.local ? 'LOCAL' : 'REMOTE', w - 64, 16);
  // Speed against setpoint.
  c.strokeStyle = '#c8c8c8';
  c.strokeRect(20, 40, 280, 26);
  c.fillStyle = '#18a840';
  c.fillRect(22, 42, (276 * d.hz) / 60, 22);
  c.fillStyle = '#ffe14a';
  c.fillRect(20 + (280 * d.setpoint) / 60 - 1, 36, 3, 34);
  c.font = `bold 20px ${FONT}`;
  c.fillStyle = '#ffffff';
  c.fillText(
    `${d.hz.toFixed(1)} HZ  ${((d.hz / 60) * 1750).toFixed(0)} RPM`,
    20,
    96,
  );
  c.font = `14px ${FONT}`;
  c.fillStyle = '#c8c8c8';
  c.fillText(
    `SET ${d.setpoint.toFixed(0)} HZ   ${d.amps.toFixed(1)} A   ${d.reverse ? 'REV' : 'FWD'}`,
    20,
    118,
  );
  c.fillStyle = d.heatsink >= 75 ? '#ff6b5b' : '#c8c8c8';
  c.fillText(`HEATSINK ${d.heatsink.toFixed(0)} C`, 20, 138);
  const permits: [string, boolean][] = [
    ['LUBE OIL', d.oilOk],
    ['ISOLATOR', d.isolator],
    ['COOLING FAN', d.cooling],
  ];
  permits.forEach(([label, ok], i) => {
    c.fillStyle = ok ? '#18a840' : '#d82a1e';
    c.fillRect(20, 152 + i * 20, 12, 12);
    c.fillStyle = '#c8c8c8';
    c.fillText(label, 40, 163 + i * 20);
  });
  c.font = `bold 15px ${FONT}`;
  c.fillStyle = d.block ? '#ffb01a' : '#7dff9a';
  c.fillText(d.block ? `HOLD: ${d.block}` : 'READY', 20, 228);
}

export function drawEventLog(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  seconds: number,
  log: {
    enabled: boolean;
    stroking: boolean;
    stroke: number;
    strokes: number;
    events: readonly string[];
  },
) {
  const ink = '#ffb21e';
  c.fillStyle = '#100800';
  c.fillRect(0, 0, w, h);
  c.fillStyle = ink;
  c.fillRect(0, 0, w, 20);
  c.fillStyle = '#100800';
  c.font = `bold 14px ${FONT}`;
  c.fillText('DINGLE ARM / EVENT LOG', 6, 15);
  c.fillStyle = ink;
  c.font = `13px ${FONT}`;
  const status = !log.enabled
    ? 'ARM OFF'
    : log.stroking
      ? 'STROKING'
      : 'NO STROKE';
  c.fillText(`${status}  STROKES ${log.strokes}`, 6, 38);
  // The arm's stroke, as a bar.
  c.strokeStyle = ink;
  c.strokeRect(200, 28, 112, 12);
  c.fillRect(201 + log.stroke * 98, 29, 12, 10);
  const lines = log.events.slice(-9);
  lines.forEach((line, i) => c.fillText(line.slice(0, 30), 6, 62 + i * 19));
  if (Math.floor(seconds * 2) % 2)
    c.fillRect(6, 62 + lines.length * 19 - 12, 9, 14);
}
