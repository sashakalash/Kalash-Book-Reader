import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { EpubTocItem } from './EpubReader';

interface TableOfContentsProps {
  toc: EpubTocItem[];
  visible: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
}

function TocRow({
  item,
  depth,
  onNavigate,
  onClose,
}: {
  item: EpubTocItem;
  depth: number;
  onNavigate: (href: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <Pressable
        onPress={() => {
          onNavigate(item.href);
          onClose();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Go to ${item.label}`}
        className="py-3 active:bg-gray-50"
        style={{ paddingLeft: 16 + depth * 16 }}
      >
        <Text
          className={`text-sm ${depth === 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
          numberOfLines={2}
        >
          {item.label}
        </Text>
      </Pressable>
      {item.subitems?.map((sub) => (
        <TocRow
          key={sub.id}
          item={sub}
          depth={depth + 1}
          onNavigate={onNavigate}
          onClose={onClose}
        />
      ))}
    </>
  );
}

/** Side drawer showing EPUB table of contents. */
export function TableOfContents({ toc, visible, onClose, onNavigate }: TableOfContentsProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      {/* Backdrop */}
      <Pressable
        className="flex-1 bg-black/40"
        onPress={onClose}
        accessibilityLabel="Close table of contents"
        accessibilityRole="button"
      />

      {/* Drawer */}
      <SafeAreaView edges={['bottom']} className="bg-white max-h-[80%]">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <Text className="text-base font-bold text-gray-900">Contents</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            className="p-2 active:opacity-50"
          >
            <Text className="text-lg text-gray-500">✕</Text>
          </Pressable>
        </View>

        {toc.length === 0 ? (
          <View className="p-8 items-center">
            <Text className="text-gray-400 text-sm">No table of contents available</Text>
          </View>
        ) : (
          <FlatList
            data={toc}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TocRow item={item} depth={0} onNavigate={onNavigate} onClose={onClose} />
            )}
            ItemSeparatorComponent={() => <View className="h-px bg-gray-50" />}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
