import Link from '@docusaurus/Link';
import SegmentedControl from '@site/src/components/SegmentedControl';
import { useEffect, useRef, useState } from 'react';
import FoldableModel from './FoldableModel';
import type { Posture } from './scene';
import styles from './styles.module.css';

const postures: readonly Posture[] = ['book', 'tabletop'];

const MIN_ANGLE = 45;
const RESTING_ANGLE = 115;

// Made up for the demo: on a device, the OS decides when a fold stops
// counting as flat.
const FLAT_FROM = 165;

// Unfolds from flat to RESTING_ANGLE once, so the hinge reads as something
// to play with. Stops as soon as the reader moves the slider.
function useOpeningFold(
  setAngle: (angle: number) => void,
  touched: React.RefObject<boolean>
) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAngle(RESTING_ANGLE);
      return undefined;
    }

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      if (touched.current) {
        return;
      }
      const progress = Math.min((now - start) / 1400, 1);
      const eased = 1 - (1 - progress) ** 3;
      setAngle(180 - (180 - RESTING_ANGLE) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [setAngle, touched]);
}

export default function FoldableDemo() {
  const [angle, setAngle] = useState(180);
  const [posture, setPosture] = useState<Posture>('book');
  const touched = useRef(false);
  useOpeningFold(setAngle, touched);

  const book = posture === 'book';
  const halfOpened = angle < FLAT_FROM;

  const readout: Array<[string, string]> = [
    ['hinge.hingeAngle', String(Math.round(angle))],
    ['foldFeatures[0].state', halfOpened ? "'halfOpened'" : "'flat'"],
    ['foldFeatures[0].orientation', book ? "'vertical'" : "'horizontal'"],
    ['isBookPosture()', String(halfOpened && book)],
    ['isTabletopPosture()', String(halfOpened && !book)],
  ];

  return (
    <section className={styles.demo} aria-label="Fold demo">
      <div className={styles.scene}>
        <FoldableModel
          angle={angle}
          posture={posture}
          halfOpened={halfOpened}
        />
      </div>

      <div className={styles.controls}>
        <SegmentedControl
          label="Posture"
          options={postures}
          value={posture}
          onChange={setPosture}
        />
        <label className={styles.slider}>
          <span>Hinge angle</span>
          <input
            type="range"
            min={MIN_ANGLE}
            max={180}
            value={Math.round(angle)}
            aria-valuetext={`${Math.round(angle)} degrees`}
            onChange={(event) => {
              touched.current = true;
              setAngle(Number(event.target.value));
            }}
          />
        </label>
        <dl className={styles.readout}>
          {readout.map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.caption}>
          Drag the phone to turn it. The screen runs the{' '}
          <Link to="/examples/posture/">Posture example</Link>. Where flat ends
          is up to the OS; this demo picks {FLAT_FROM}°.
        </p>
      </div>
    </section>
  );
}
