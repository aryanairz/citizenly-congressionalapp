/**
 * Motion system.
 *
 * Apple describes springs with two designer-facing numbers instead of the
 * physics triplet: a **damping ratio** (how much it overshoots) and a
 * **response** (how quickly it reaches the target, in seconds). Reanimated 4
 * takes exactly that pair as `dampingRatio` + `duration`, so the values below
 * are Apple's, not a translation of them.
 *
 * House rule: critically damped (`dampingRatio: 1`) everywhere by default.
 * Overshoot is reserved for motion the user physically caused - a flick, a
 * drag release, a card thrown off screen. A menu that merely appeared has no
 * momentum to express, so bouncing it reads as decoration.
 *
 * That default matters more here than in a typical app: the audience is
 * elderly and often low-vision, and bouncing UI is harder to track. Calm is
 * the brief, and critically damped springs are how you get calm without
 * getting sluggish.
 *
 * Every spring carries `ReduceMotion.System`, so the OS "reduce motion"
 * setting turns these into instant state changes without any call site
 * needing to know.
 */

import {
  LinearTransition,
  ReduceMotion,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';
import { Easing } from 'react-native-reanimated';

/**
 * Standard UI motion: appearing, repositioning, settling. No overshoot.
 * Apple ships damping 1.0 / response 0.4 for repositioning.
 */
export const SPRING: WithSpringConfig = {
  dampingRatio: 1,
  duration: 400,
  reduceMotion: ReduceMotion.System,
};

/**
 * Same feel, quicker. For small, frequent changes where 400ms reads as slow:
 * press feedback, chips, icon state.
 */
export const SPRING_SNAPPY: WithSpringConfig = {
  dampingRatio: 1,
  duration: 250,
  reduceMotion: ReduceMotion.System,
};

/**
 * Momentum motion, the only place overshoot is earned: the user flicked or
 * dragged and released, so the element should carry past and settle back.
 * Apple's drawer/sheet values are damping 0.8 / response 0.3.
 */
export const SPRING_MOMENTUM: WithSpringConfig = {
  dampingRatio: 0.8,
  duration: 320,
  reduceMotion: ReduceMotion.System,
};

/** Sheets and drawers entering under the user's control. */
export const SPRING_SHEET: WithSpringConfig = {
  dampingRatio: 0.85,
  duration: 350,
  reduceMotion: ReduceMotion.System,
};

/**
 * Repositioning caused by something else resizing: a panel opening below a
 * list, a row leaving a group. Same numbers as `SPRING`, because it is the
 * same kind of motion; it just animates a layout change rather than a value.
 *
 * Without this, a view whose neighbour grew teleports to its new position in
 * a single frame while the neighbour animates in, and the two read as
 * unrelated events instead of one.
 */
export const LAYOUT = LinearTransition.springify(400)
  .dampingRatio(1)
  .reduceMotion(ReduceMotion.System);

/**
 * Non-interactive cross-fades (opacity only). A spring on opacity is wasted
 * motion; a short symmetric curve is the honest tool.
 */
export const FADE: WithTimingConfig = {
  duration: 200,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};

/** The mirror of FADE, so a reversible transition retraces its own path. */
export const FADE_OUT: WithTimingConfig = {
  duration: 200,
  easing: Easing.in(Easing.quad),
  reduceMotion: ReduceMotion.System,
};

/**
 * How far an element shrinks when pressed.
 *
 * Scale communicates the press on any background, including the navy fill
 * where an opacity change is nearly invisible. Large surfaces need less of it:
 * the same ratio that reads as a gentle push on a 56px button reads as a
 * collapse on a full-width card.
 */
export const PRESS_SCALE = {
  /** Buttons, icon buttons, chips. */
  control: 0.97,
  /** Cards, list rows, option rows - large surfaces. */
  surface: 0.985,
} as const;

/**
 * Projects where a flick would come to rest, so a released gesture lands
 * where it was *going* rather than snapping back to the nearest edge from
 * wherever the finger happened to let go.
 *
 * This is Apple's exponential-decay form from the Designing Fluid Interfaces
 * sample code, not the textbook v^2/(2a) - they behave differently and this
 * is the one that matches scroll deceleration.
 *
 * @param velocity px/s at release
 * @param decelerationRate 0.998 for normal scroll feel, 0.99 for snappier
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  'worklet';
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary. A hard stop reads as frozen;
 * resistance that grows the further you push reads as responsive but empty.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
