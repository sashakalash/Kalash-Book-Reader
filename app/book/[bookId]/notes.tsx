import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { getNotesForBook, createNote, updateNote, deleteNote } from '@/services/db/notes';
import type { NoteRow } from '@/services/db/schema';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Notes screen — list, add, inline edit, delete. */
export default function NotesScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();

  const [notesList, setNotesList] = useState<NoteRow[]>([]);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const refresh = useCallback(() => {
    if (bookId) setNotesList(getNotesForBook(bookId));
  }, [bookId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = () => {
    if (!bookId || !newText.trim()) return;
    createNote(bookId, newText.trim());
    setNewText('');
    refresh();
  };

  const startEdit = (note: NoteRow) => {
    setEditingId(note.id);
    setEditText(note.text);
  };

  const commitEdit = () => {
    if (editingId && editText.trim()) {
      updateNote(editingId, editText.trim());
      refresh();
    }
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = (note: NoteRow) => {
    Alert.alert('Delete note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteNote(note.id);
          refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
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
        <Text className="text-lg font-bold text-gray-900">Notes</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Notes list */}
        <FlatList
          data={notesList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-2xl">📝</Text>
              <Text className="mt-2 text-sm text-gray-400">No notes yet. Add one below.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              {editingId === item.id ? (
                <TextInput
                  value={editText}
                  onChangeText={setEditText}
                  onSubmitEditing={commitEdit}
                  onBlur={commitEdit}
                  multiline
                  autoFocus
                  returnKeyType="done"
                  className="text-sm text-gray-800 leading-relaxed"
                  accessibilityLabel="Edit note"
                />
              ) : (
                <Pressable
                  onPress={() => startEdit(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Edit note"
                  className="active:opacity-70"
                >
                  <Text className="text-sm text-gray-800 leading-relaxed">{item.text}</Text>
                </Pressable>
              )}
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-xs text-gray-400">{formatDate(item.createdAt)}</Text>
                <Pressable
                  onPress={() => handleDelete(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Delete note"
                  className="p-1 active:opacity-50"
                >
                  <Text className="text-xs text-red-400">Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />

        {/* Add note input */}
        <SafeAreaView edges={['bottom']} className="border-t border-gray-100 bg-white px-4 py-3">
          <View className="flex-row items-end gap-2">
            <TextInput
              ref={inputRef}
              value={newText}
              onChangeText={setNewText}
              placeholder="Add a note…"
              placeholderTextColor="#9ca3af"
              multiline
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 max-h-28"
              accessibilityLabel="New note text"
            />
            <Pressable
              onPress={handleAdd}
              disabled={!newText.trim()}
              accessibilityRole="button"
              accessibilityLabel="Add note"
              className={`rounded-xl px-4 py-2.5 ${newText.trim() ? 'bg-blue-500 active:bg-blue-600' : 'bg-gray-200'}`}
            >
              <Text
                className={`text-sm font-semibold ${newText.trim() ? 'text-white' : 'text-gray-400'}`}
              >
                Add
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
