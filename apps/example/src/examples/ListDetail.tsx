import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useHinge } from 'react-native-nitro-hinge';

const messages = [
  {
    from: 'Ana',
    subject: 'Lunch on Friday?',
    body: 'Noon at the usual place?',
  },
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
            <Text style={{ fontSize: 17, fontWeight: '600' }}>
              {message.from}
            </Text>
            <Text style={{ fontSize: 15, color: '#475569' }}>
              {message.subject}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Phones show the list. Wide windows show the message next to it. */}
      {wide && (
        <View style={{ flex: 2, padding: 24, backgroundColor: '#f8fafc' }}>
          <Text style={{ fontSize: 24, fontWeight: '700' }}>
            {open.subject}
          </Text>
          <Text style={{ marginTop: 8, fontSize: 17 }}>{open.body}</Text>
        </View>
      )}
    </View>
  );
}
