import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import listDetailGif from '@site/../../docs/img/list-detail.gif';
import postureGif from '@site/../../docs/img/posture.gif';
import CopyCommand from '@site/src/components/CopyCommand';
import FoldableDemo from '@site/src/components/FoldableDemo';
import SegmentedControl from '@site/src/components/SegmentedControl';
import CodeBlock from '@theme/CodeBlock';
import Layout from '@theme/Layout';
import { useState } from 'react';
import styles from './index.module.css';

const site = 'https://gautham495.github.io/react-native-nitro-hinge/';

const packages = 'react-native-nitro-hinge react-native-nitro-modules';

const installCommands = {
  npm: `npm install ${packages}`,
  yarn: `yarn add ${packages}`,
  pnpm: `pnpm add ${packages}`,
};

type PackageManager = keyof typeof installCommands;

const packageManagers = Object.keys(installCommands) as PackageManager[];

const sizeClassExample = `import { useHinge } from 'react-native-nitro-hinge';

function Screen() {
  const wide = useHinge((s) => s.widthClass !== 'compact');
  return wide ? <TwoPanes /> : <OnePane />;
}`;

const hingeAngleExample = `import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useAnimatedHingeAngle } from 'react-native-nitro-hinge/reanimated';

function Lid() {
  const angle = useAnimatedHingeAngle();
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: \`\${180 - (angle.value ?? 180)}deg\` }],
  }));
  return <Animated.View style={style} />;
}`;

const features = [
  {
    title: 'Synchronous reads',
    body: "Every getter is a native read through Nitro's JSI bridge, so it works at module load and inside StyleSheet.create.",
  },
  {
    title: 'One listener for every hook',
    body: 'All useHinge callers share one native listener. A selector re-renders only when its slice changes.',
  },
  {
    title: 'Hinge angle on the UI thread',
    body: 'The Reanimated hooks update shared values straight from native, so animations keep moving while the JS thread is busy.',
  },
  {
    title: 'Tri-folds included',
    body: 'foldFeatures is an array: one entry on a foldable, two on a tri-fold with both hinges half open, none on phones.',
  },
];

function InstallCommand() {
  const [manager, setManager] = useState<PackageManager>('npm');

  return (
    <div className={styles.installCard}>
      <SegmentedControl
        label="Package manager"
        options={packageManagers}
        value={manager}
        onChange={setManager}
      />
      <CopyCommand command={installCommands[manager]} />
    </div>
  );
}

function Hero() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={styles.hero}>
      <p className={styles.eyebrow}>
        v{String(siteConfig.customFields?.version)} · iOS and Android
      </p>
      <h1 className={styles.title}>Layouts that follow the window</h1>
      <p className={styles.subtitle}>
        Size class, safe insets, hinge geometry and hinge angle for React
        Native. One API for phones, tablets, Android foldables, tri-folds and
        the iPhone Duo.
      </p>
      <InstallCommand />
      <div className={styles.actions}>
        <Link className="button button--primary button--lg" to="/intro/">
          Get started
        </Link>
        <Link
          className="button button--secondary button--lg"
          to="/reference/api/"
        >
          Read the API
        </Link>
      </div>
    </header>
  );
}

function Recordings() {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Recorded from the example app</h2>
      <div className={styles.recordings}>
        <figure className={styles.recording}>
          <img
            src={listDetailGif}
            alt="List / detail example on the iPhone Duo simulator"
            width={600}
            height={422}
          />
          <figcaption>List / detail on the iPhone Duo simulator</figcaption>
        </figure>
        <figure className={styles.recording}>
          <img
            src={postureGif}
            alt="Posture example on an Android foldable emulator"
            width={360}
            height={374}
          />
          <figcaption>
            Book and tabletop postures on an Android emulator
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Code() {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Ask the window, not the device</h2>
      <p className={styles.sectionLead}>
        Branch on the size class for the layout. Fold geometry moves content
        around the hinge, and the hinge angle drives animations.
      </p>
      <div className={styles.codeGrid}>
        <CodeBlock language="tsx" title="Screen.tsx">
          {sizeClassExample}
        </CodeBlock>
        <CodeBlock language="tsx" title="Lid.tsx">
          {hingeAngleExample}
        </CodeBlock>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>How it works</h2>
      <div className={styles.featureGrid}>
        {features.map((feature) => (
          <div key={feature.title} className={styles.feature}>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Agents() {
  return (
    <section className={styles.section}>
      <div className={styles.agents}>
        <h2 className={styles.sectionTitle}>
          Your coding agent gets the API right
        </h2>
        <p className={styles.sectionLead}>
          The agent skill gives Claude Code and Codex the real API, so they
          don't invent functions. Every page here is also served as Markdown and
          listed in llms.txt.
        </p>
        <div className={styles.agentsCommand}>
          <CopyCommand command="npx skills add Gautham495/react-native-nitro-hinge" />
        </div>
        <div className={styles.actions}>
          <Link className="button button--secondary" to="/ai-agents/">
            AI agents guide
          </Link>
          <Link className="button button--secondary" href={`${site}llms.txt`}>
            llms.txt
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Layout
      title="Adaptive layouts for foldables, tablets and the iPhone Duo"
      description="Size class, safe insets, hinge geometry and hinge angle for React Native on iOS and Android. One API for phones, tablets, Android foldables, tri-folds and the iPhone Duo."
    >
      <main className={styles.main}>
        <Hero />
        <FoldableDemo />
        <Code />
        <Recordings />
        <Features />
        <Agents />
      </main>
    </Layout>
  );
}
