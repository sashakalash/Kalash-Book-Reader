import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  getAllCategories,
  createCategory,
  renameCategory,
  deleteCategory,
} from '@/services/db/categories';
import type { CategoryRow } from '@/services/db/schema';

/** Full-screen categories manager — create, rename, delete. */
export default function CategoriesScreen() {
  const router = useRouter();
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const refresh = useCallback(() => setCats(getAllCategories()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createCategory(trimmed);
    setNewName('');
    refresh();
  };

  const startEdit = (cat: CategoryRow) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const commitEdit = () => {
    if (editingId && editName.trim()) {
      renameCategory(editingId, editName.trim());
      refresh();
    }
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (cat: CategoryRow) => {
    Alert.alert('Delete category', `Remove "${cat.name}"? Books will not be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteCategory(cat.id);
          refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="p-2 -ml-2 active:opacity-50 mr-2"
        >
          <Text className="text-2xl text-gray-700">‹</Text>
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">Categories</Text>
      </View>

      {/* Add new */}
      <View className="flex-row items-center gap-2 px-4 py-3 border-b border-gray-100">
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="New category name"
          placeholderTextColor="#9ca3af"
          returnKeyType="done"
          onSubmitEditing={handleCreate}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900"
          accessibilityLabel="New category name"
        />
        <Pressable
          onPress={handleCreate}
          disabled={!newName.trim()}
          accessibilityRole="button"
          accessibilityLabel="Add category"
          className={`rounded-xl px-4 py-2.5 ${newName.trim() ? 'bg-blue-500 active:bg-blue-600' : 'bg-gray-200'}`}
        >
          <Text
            className={`text-sm font-semibold ${newName.trim() ? 'text-white' : 'text-gray-400'}`}
          >
            Add
          </Text>
        </Pressable>
      </View>

      {/* List */}
      <FlatList
        data={cats}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-gray-400">No categories yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center px-4 py-3 border-b border-gray-50">
            {editingId === item.id ? (
              <TextInput
                value={editName}
                onChangeText={setEditName}
                onSubmitEditing={commitEdit}
                onBlur={commitEdit}
                autoFocus
                returnKeyType="done"
                className="flex-1 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-gray-900"
                accessibilityLabel="Edit category name"
              />
            ) : (
              <Pressable
                onPress={() => startEdit(item)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.name}`}
                className="flex-1 active:opacity-60"
              >
                <Text className="text-sm text-gray-800">{item.name}</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => handleDelete(item)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.name}`}
              className="ml-3 p-2 active:opacity-50"
            >
              <Text className="text-gray-400">🗑</Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
