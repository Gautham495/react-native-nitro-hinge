# Layouts

Pick the layout from the size class first. Use fold geometry and posture
on top of that, only where content should move around the hinge.

## Branch on the size class

```tsx
import { FlatList, type ListRenderItem } from 'react-native';
import { useHinge, responsive } from 'react-native-nitro-hinge';

function Grid<T>(props: { data: T[]; renderItem: ListRenderItem<T> }) {
  // Re-render on class changes, then read the helper during render.
  useHinge((s) => s.widthClass);
  const columns = responsive({ compact: 1, medium: 2, expanded: 3 }) ?? 1;
  return <FlatList {...props} numColumns={columns} key={columns} />;
}
```

`FlatList` can't change `numColumns` on the fly, so `key={columns}`
remounts it.

## List / detail

Phones show the list. Wide windows, like the inner display of a foldable,
show the open item next to it. The same code runs in the example app.

```tsx
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useHinge } from 'react-native-nitro-hinge';

const messages = [
  { from: 'Ana', subject: 'Lunch on Friday?', body: 'Noon at the usual place?' },
  { from: 'Leo', subject: 'Design review', body: 'Notes from today are up.' },
  { from: 'Mia', subject: 'Flight check-in', body: 'Gate B12, boarding 9:40.' },
] as const;

type Message = (typeof messages)[number];

export function ListDetail() {
  const { widthClass, safeInsets } = useHinge();
  const [open, setOpen] = useState<Message>(messages[0]);
  const wide = widthClass !== 'compact';

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        paddingTop: safeInsets.top,
        paddingLeft: safeInsets.left,
        paddingRight: safeInsets.right,
      }}
    >
      <View style={{ flex: 1 }}>
        {messages.map((message) => (
          <Pressable
            key={message.subject}
            onPress={() => setOpen(message)}
            style={{
              padding: 16,
              backgroundColor: wide && message === open ? '#e0e7ff' : 'white',
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '600' }}>{message.from}</Text>
            <Text style={{ fontSize: 15, color: '#475569' }}>{message.subject}</Text>
          </Pressable>
        ))}
      </View>

      {wide && (
        <View style={{ flex: 2, padding: 24, backgroundColor: '#f8fafc' }}>
          <Text style={{ fontSize: 24, fontWeight: '700' }}>{open.subject}</Text>
          <Text style={{ marginTop: 8, fontSize: 17 }}>{open.body}</Text>
        </View>
      )}
    </View>
  );
}
```

On a phone, tapping a row would usually open a detail screen. This
example leaves that out.

## Split at the hinge (book and tabletop)

When the device is half open, put the split exactly on the fold. Bounds
are window coordinates, so the component has to fill the window (not sit
inside a `SafeAreaView` or under a header).

```tsx
import { Text, View } from 'react-native';
import { useHinge } from 'react-native-nitro-hinge';

export function Posture() {
  const fold = useHinge((s) =>
    s.foldFeatures.find((f) => f.state === 'halfOpened')
  );

  if (!fold) {
    return <Pane label="Flat" />;
  }

  // Tabletop stacks the panes and book puts them side by side, with the
  // gap on the hinge.
  const tabletop = fold.orientation === 'horizontal';
  const { x, y, width, height } = fold.bounds;

  return (
    <View style={{ flex: 1, flexDirection: tabletop ? 'column' : 'row' }}>
      <View style={tabletop ? { height: y } : { width: x }}>
        <Pane label={tabletop ? 'Video' : 'Page 1'} dark />
      </View>
      <View style={tabletop ? { height } : { width }} />
      <View style={{ flex: 1 }}>
        <Pane label={tabletop ? 'Controls' : 'Page 2'} />
      </View>
    </View>
  );
}

function Pane({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: dark ? '#0f172a' : '#e0e7ff',
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: '700', color: dark ? 'white' : '#0f172a' }}>
        {label}
      </Text>
    </View>
  );
}
```

The selector returns an element of `foldFeatures`, which keeps its
reference while the fold doesn't change, so it needs no `isEqual`. The
panes here are full-bleed backgrounds, so pad real content inside them
with `safeInsets`.

### Under a header

When the component doesn't start at the window's top left corner, for
example below a navigation header or inside a `SafeAreaView`, convert
the bounds to local coordinates. `measureInWindow` gives the view's
position in the window:

```tsx
import { useRef, useState } from 'react';
import { View } from 'react-native';

function useWindowOrigin() {
  const ref = useRef<View>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const onLayout = () =>
    ref.current?.measureInWindow((x, y) => setOrigin({ x, y }));
  return { ref, onLayout, origin };
}

// <View ref={ref} onLayout={onLayout} style={{ flex: 1 }}>
// top pane height: fold.bounds.y - origin.y
// left pane width: fold.bounds.x - origin.x
```

Tabletop suits video or a camera above and controls below. Book suits two
pages or a list and its detail. When the fold is flat, go back to the
size class layout.

## Keep content off a separating fold

Some folds separate content even when flat, such as a hinge that hides
pixels (`occlusionType === 'full'`). When `isSeparating` is true, size the
first pane to end at the fold instead of using `flex` ratios:

```tsx
const fold = useHinge((s) => s.foldFeatures.find((f) => f.isSeparating));
const leftWidth = fold?.orientation === 'vertical' ? fold.bounds.x : undefined;
```

Then give the left pane `width: leftWidth` and leave a gap of
`fold.bounds.width`.

## Safe insets

Pad each side with its own inset. The iPhone Duo puts a vertical bar on
one side, so `left` and `right` differ.

```tsx
const insets = useHinge((s) => s.safeInsets);
<View
  style={{
    paddingTop: insets.top,
    paddingRight: insets.right,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
  }}
/>;
```

`contentWidth()` and `contentHeight()` give the size inside the insets.

## Styles that reflow

`StyleSheet.create` at module load freezes the numbers of the launch
pose. To reflow, rebuild the sheet when any field it reads changes.
`isWide()` and `font()` read `widthClass`, and `space()` reads
`windowWidth`, so this sheet depends on both:

```tsx
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useHinge, isWide, space, font } from 'react-native-nitro-hinge';

const makeStyles = () =>
  StyleSheet.create({
    container: { padding: space(16), flexDirection: isWide() ? 'row' : 'column' },
    title: { fontSize: font(24) },
  });

function Screen() {
  const widthClass = useHinge((s) => s.widthClass);
  const windowWidth = useHinge((s) => s.windowWidth);
  const styles = useMemo(makeStyles, [widthClass, windowWidth]);
  // ...
}
```

Keying on `widthClass` alone leaves `space()` stale when the window
resizes within the same class, such as a phone rotating.

Module-level styles are fine for screens that never reflow.

## Tri-folds

A tri-fold with both hinges half open reports two folds, ordered left to
right or top to bottom. Loop over `foldFeatures` instead of reading
`foldFeatures[0]` when every hinge matters, and use `isTriFold()` to
check for more than one.
