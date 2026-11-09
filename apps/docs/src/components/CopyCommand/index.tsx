import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import styles from './styles.module.css';

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

// A shell command that copies itself on click, from the text or the button.
export default function CopyCommand({ command }: { command: string }) {
  const textRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => setCopied(false), [command]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    if (textRef.current) {
      window.getSelection()?.selectAllChildren(textRef.current);
    }
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      // The command stays selected, so Cmd+C still works.
    }
  }

  return (
    <div className={styles.command}>
      <span className={styles.prompt} aria-hidden="true">
        $
      </span>
      <code ref={textRef} className={styles.text} onClick={copy}>
        {command}
      </code>
      <button
        type="button"
        className={clsx(styles.button, copied && styles.copied)}
        onClick={copy}
        aria-label="Copy command"
        title="Copy command"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
      <span className={styles.status} aria-live="polite">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </div>
  );
}
