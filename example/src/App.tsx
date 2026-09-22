import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  useHinge,
  font,
  space,
  radius,
  responsive,
  isCompactWidth,
  isWide,
  hasActiveFold,
  isBookPosture,
  isTabletopPosture,
  contentWidth,
  configureHinge,
} from 'react-native-nitro-hinge';
import { SafeAreaView } from 'react-native-safe-area-context';

// Configure once at app start. If your design mocks were drawn at
// 375pt (older iPhone), set that here. Default is 390.
configureHinge({ baselineWidth: 390 });

// -----------------------------------------------------------------
// Pattern 1: Static styles at module load
// Fine for screens that don't need to reflow on pose change.
// Values are frozen at import time.
// -----------------------------------------------------------------

const staticStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: space(16),
    backgroundColor: '#f7f7f8',
  },
  title: {
    fontSize: font(24),
    fontWeight: '600',
    marginBottom: space(8),
  },
});

// -----------------------------------------------------------------
// Pattern 2: Factory styles that reflow on pose change
// The recommended pattern for screens that render on foldables or
// iPad. useMemo keeps the StyleSheet.create call cheap by only
// re-running when the width class actually changes.
// -----------------------------------------------------------------

const makeAdaptiveStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: space(16),
      flexDirection: isWide() ? 'row' : 'column',
      gap: space(16),
    },
    card: {
      flex: 1,
      padding: space(16),
      borderRadius: radius(12),
      backgroundColor: 'white',
      // Cap width so cards don't stretch to 600pt on tablet.
      maxWidth: 560,
    },
    cardTitle: {
      fontSize: font(20),
      fontWeight: '600',
      marginBottom: space(8),
    },
    cardBody: {
      fontSize: font(15),
      lineHeight: font(22),
      color: '#333',
    },
  });

// -----------------------------------------------------------------
// The screen
// -----------------------------------------------------------------

export default function App() {
  // Subscribing to Hinge state re-renders on any layout change.
  // The returned object is a fresh snapshot; the getters on the
  // `hinge` global would still work but wouldn't trigger renders.
  const state = useHinge();

  // Rebuild the StyleSheet only when the width class flips.
  // Rebuilding on every state change would work but is wasteful.
  const styles = useMemo(makeAdaptiveStyles, [state.widthClass]);

  // Column count changes by breakpoint.
  const columns = responsive({ compact: 1, medium: 2, expanded: 3 }) ?? 1;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space(16) }}>
        <Text style={staticStyles.title}>Hinge Demo</Text>

        <StatusBlock state={state} columns={columns} />

        <View style={{ marginTop: space(24) }}>
          <Text style={staticStyles.title}>Adaptive layout</Text>
          <View style={styles.container}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pane A</Text>
              <Text style={styles.cardBody}>
                On phones this stacks. On tablets and unfolded foldables, it
                sits side-by-side with Pane B. Works because flexDirection reads
                from isWide().
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pane B</Text>
              <Text style={styles.cardBody}>
                The maxWidth cap keeps text at a readable measure (~560pt) so it
                doesn't stretch across the whole iPad.
              </Text>
            </View>
          </View>
        </View>

        {state.foldFeatures.map((fold, i) => (
          <HingeInfo
            key={i}
            fold={fold}
            index={i}
            total={state.foldFeatures.length}
          />
        ))}

        <PosturePane />
      </ScrollView>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------
// A block that shows current layout signals
// -----------------------------------------------------------------

function StatusBlock({
  state,
  columns,
}: {
  state: ReturnType<typeof useHinge>;
  columns: number;
}) {
  return (
    <View
      style={{
        padding: space(12),
        borderRadius: radius(8),
        backgroundColor: 'white',
      }}
    >
      <Row label="Width class" value={state.widthClass} />
      <Row label="Height class" value={state.heightClass} />
      <Row
        label="Window"
        value={`${Math.round(state.windowWidth)} × ${Math.round(state.windowHeight)}`}
      />
      <Row label="Content width" value={`${Math.round(contentWidth())}`} />
      <Row
        label="Safe insets"
        value={`t${Math.round(state.safeInsets.top)} r${Math.round(state.safeInsets.right)} b${Math.round(state.safeInsets.bottom)} l${Math.round(state.safeInsets.left)}`}
      />
      <Row label="Font scale" value={state.fontScale.toFixed(2)} />
      <Row label="Columns for this width" value={String(columns)} />
      <Row
        label="isCompact / isWide"
        value={`${isCompactWidth()} / ${isWide()}`}
      />
      <Row label="Has active fold" value={String(hasActiveFold())} />
      <Row
        label="Book / Tabletop"
        value={`${isBookPosture()} / ${isTabletopPosture()}`}
      />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontSize: font(14), color: '#666' }}>{label}</Text>
      <Text style={{ fontSize: font(14), fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

// -----------------------------------------------------------------
// Hinge geometry — rendered once per active fold.
// On typical foldables this shows once. On tri-folds it shows twice
// when both hinges are half-open.
// -----------------------------------------------------------------

import type { FoldFeature } from 'react-native-nitro-hinge';

function HingeInfo({
  fold,
  index,
  total,
}: {
  fold: FoldFeature;
  index: number;
  total: number;
}) {
  return (
    <View
      style={{
        marginTop: space(16),
        padding: space(12),
        borderRadius: radius(8),
        backgroundColor: '#fff3cd',
      }}
    >
      <Text
        style={{
          fontSize: font(16),
          fontWeight: '600',
          marginBottom: space(8),
        }}
      >
        {total > 1 ? `Fold ${index + 1} of ${total}` : 'Active fold detected'}
      </Text>
      <Row label="Orientation" value={fold.orientation} />
      <Row label="State" value={fold.state} />
      <Row label="Is separating" value={String(fold.isSeparating)} />
      <Row label="Occlusion" value={fold.occlusionType} />
      <Row
        label="Bounds"
        value={`x${Math.round(fold.bounds.x)} y${Math.round(fold.bounds.y)} w${Math.round(fold.bounds.width)} h${Math.round(fold.bounds.height)}`}
      />
    </View>
  );
}

// -----------------------------------------------------------------
// Posture-specific pane (tabletop / book)
// This uses posture for CONTENT arrangement decisions — not for
// layout branches on every screen. Only appears when relevant.
// -----------------------------------------------------------------

function PosturePane() {
  if (isTabletopPosture()) {
    return (
      <View style={{ marginTop: space(24) }}>
        <View
          style={{
            padding: space(16),
            borderRadius: radius(12),
            backgroundColor: '#0f172a',
          }}
        >
          <Text style={{ color: 'white', fontSize: font(18) }}>
            Video preview here (top pane in tabletop mode)
          </Text>
        </View>
        <View
          style={{
            padding: space(16),
            borderRadius: radius(12),
            backgroundColor: '#f1f5f9',
            marginTop: space(8),
          }}
        >
          <Text style={{ fontSize: font(14) }}>
            Playback controls here (bottom pane)
          </Text>
        </View>
      </View>
    );
  }

  if (isBookPosture()) {
    return (
      <View
        style={{ marginTop: space(24), flexDirection: 'row', gap: space(8) }}
      >
        <View
          style={{
            flex: 1,
            padding: space(16),
            borderRadius: radius(12),
            backgroundColor: '#fef9c3',
          }}
        >
          <Text style={{ fontSize: font(14) }}>Left page (book posture)</Text>
        </View>
        <View
          style={{
            flex: 1,
            padding: space(16),
            borderRadius: radius(12),
            backgroundColor: '#fef9c3',
          }}
        >
          <Text style={{ fontSize: font(14) }}>Right page</Text>
        </View>
      </View>
    );
  }

  return null;
}
