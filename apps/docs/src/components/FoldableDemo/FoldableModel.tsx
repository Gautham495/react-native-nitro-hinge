import { useEffect, useRef } from 'react';
import type { FoldableScene, FoldState } from './scene';
import styles from './styles.module.css';

// three.js only loads in the browser, after the page renders, so the server
// build and the first paint skip it.
export default function FoldableModel(props: FoldState) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<FoldableScene | null>(null);
  const latest = useRef(props);

  useEffect(() => {
    let disposed = false;
    import('./scene').then(({ createFoldableScene }) => {
      if (disposed || !canvasRef.current) {
        return;
      }
      try {
        sceneRef.current = createFoldableScene(canvasRef.current);
        sceneRef.current.update(latest.current);
      } catch {
        // No WebGL: the canvas stays empty and the readout still works.
      }
    });
    return () => {
      disposed = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const { angle, posture, halfOpened } = props;
  useEffect(() => {
    latest.current = { angle, posture, halfOpened };
    sceneRef.current?.update(latest.current);
  }, [angle, posture, halfOpened]);

  return (
    <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
  );
}
