import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getAllCategories,
  createCategory,
  renameCategory,
  deleteCategory,
  getCategoriesForBook,
} from '@/services/db/categories';
import { assignCategory, removeCategory } from '@/services/db/books';
import type { CategoryRow } from '@/services/db/schema';

// ---------------------------------------------------------------------------
// Assign mode — checkbox list for a specific book
// ---------------------------------------------------------------------------

interface AssignModeProps {
  bookId: string;
  onCategoriesChanged?: () => void;
}

function AssignMode({ bookId, onCategoriesChanged }: AssignModeProps) {
  const [allCategories, setAllCategories] = useState<CategoryRow[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const reload = useCallback(() => {
    setAllCategories(getAllCategories());
    setAssigned(new Set(getCategoriesForBook(bookId).map((c) => c.id)));
  }, [bookId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const toggle = (categoryId: string) => {
    if (assigned.has(categoryId)) {
      removeCategory(bookId, categoryId);
    } else {
      assignCategory(bookId, categoryId);
    }
    reload();
    onCategoriesChanged?.();
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const id = createCategory(name);
    assignCategory(bookId, id);
    setNewName('');
    setAdding(false);
    reload();
    onCategoriesChanged?.();
  };

  return (
    <FlatList
      data={allCategories}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, gap: 4 }}
      renderItem={({ item }) => {
        const isAssigned = assigned.has(item.id);
        return (
          <Pressable
            onPress={() => toggle(item.id)}
            className="flex-row items-center py-3 active:bg-gray-50"
          >
            <View
              className={`mr-3 h-5 w-5 rounded items-center justify-center border-2 ${
                isAssigned ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
              }`}
            >
              {isAssigned && <Text className="text-white text-xs font-bold">✓</Text>}
            </View>
            <Text className="text-base text-gray-800">{item.name}</Text>
          </Pressable>
        );
      }}
      ListFooterComponent={
        adding ? (
          <View className="flex-row items-center gap-2 mt-3">
            <TextInput
              autoFocus
              value={newName}
              onChangeText={setNewName}
              placeholder="Shelf name…"
              placeholderTextColor="#9ca3af"
              className="flex-1 rounded-xl bg-gray-100 px-3 py-2.5 text-sm text-gray-900"
              onSubmitEditing={handleCreate}
              returnKeyType="done"
            />
            <Pressable onPress={handleCreate} className="rounded-xl bg-blue-500 px-4 py-2.5">
              <Text className="text-sm font-semibold text-white">Add</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setAdding(false);
                setNewName('');
              }}
              className="rounded-xl bg-gray-200 px-3 py-2.5"
            >
              <Text className="text-sm text-gray-600">✕</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setAdding(true)}
            className="mt-3 flex-row items-center py-2 active:opacity-60"
          >
            <Text className="text-sm font-medium text-blue-500">+ New shelf</Text>
          </Pressable>
        )
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Manage mode — create / rename / delete categories
// ---------------------------------------------------------------------------

function ManageMode() {
  const [allCategories, setAllCategories] = useState<CategoryRow[]>([]);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const reload = useCallback(() => {
    setAllCategories(getAllCategories());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createCategory(name);
    setNewName('');
    setAdding(false);
    reload();
  };

  const handleRename = (cat: CategoryRow) => {
    Alert.prompt(
      'Rename shelf',
      undefined,
      (text) => {
        const name = text?.trim();
        if (name) {
          renameCategory(cat.id, name);
          reload();
        }
      },
      'plain-text',
      cat.name,
    );
  };

  const handleDelete = (cat: CategoryRow) => {
    Alert.alert('Delete shelf', `Remove "${cat.name}"? Books won't be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteCategory(cat.id);
          reload();
        },
      },
    ]);
  };

  return (
    <FlatList
      data={allCategories}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, gap: 4 }}
      ListEmptyComponent={
        !adding ? (
          <View className="items-center py-16">
            <Ionicons name="folder-outline" size={40} color="#9ca3af" style={{ marginBottom: 8 }} />
            <Text className="text-gray-400 text-sm">No shelves yet</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <View className="flex-row items-center py-3">
          <Text className="flex-1 text-base text-gray-800">{item.name}</Text>
          <Pressable onPress={() => handleRename(item)} className="ml-3 active:opacity-50">
            <Text className="text-sm text-blue-500 font-medium">Rename</Text>
          </Pressable>
          <Pressable onPress={() => handleDelete(item)} className="ml-4 active:opacity-50">
            <Text className="text-sm text-red-400 font-medium">Delete</Text>
          </Pressable>
        </View>
      )}
      ListFooterComponent={
        adding ? (
          <View className="flex-row items-center gap-2 mt-3">
            <TextInput
              autoFocus
              value={newName}
              onChangeText={setNewName}
              placeholder="Shelf name…"
              placeholderTextColor="#9ca3af"
              className="flex-1 rounded-xl bg-gray-100 px-3 py-2.5 text-sm text-gray-900"
              onSubmitEditing={handleCreate}
              returnKeyType="done"
            />
            <Pressable onPress={handleCreate} className="rounded-xl bg-blue-500 px-4 py-2.5">
              <Text className="text-sm font-semibold text-white">Add</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setAdding(false);
                setNewName('');
              }}
              className="rounded-xl bg-gray-200 px-3 py-2.5"
            >
              <Text className="text-sm text-gray-600">✕</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setAdding(true)}
            className="mt-3 flex-row items-center py-2 active:opacity-60"
          >
            <Text className="text-sm font-medium text-blue-500">+ New shelf</Text>
          </Pressable>
        )
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface CategoriesModalProps {
  visible: boolean;
  /** When provided (non-null), opens in assign mode for this book. Null = manage mode. */
  bookId: string | null;
  bookTitle?: string;
  onClose: () => void;
  onCategoriesChanged?: () => void;
}

/** Full-screen modal: assign shelves to a book (bookId set) or manage all shelves (bookId null). */
export function CategoriesModal({
  visible,
  bookId,
  bookTitle,
  onClose,
  onCategoriesChanged,
}: CategoriesModalProps) {
  const insets = useSafeAreaInsets();
  const isAssign = bookId !== null;
  const title = isAssign ? `Shelves · ${bookTitle ?? ''}` : 'Manage shelves';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray-100">
          <Text className="text-base font-bold text-gray-900 flex-1 mr-3" numberOfLines={1}>
            {title}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            className="p-1"
          >
            <Text className="text-gray-400 text-lg">✕</Text>
          </Pressable>
        </View>

        {isAssign ? (
          <AssignMode bookId={bookId} onCategoriesChanged={onCategoriesChanged} />
        ) : (
          <ManageMode />
        )}
      </View>
    </Modal>
  );
}
