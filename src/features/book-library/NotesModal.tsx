import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getNotesForBook, createNote, updateNote, deleteNote } from '@/services/db/notes';
import type { NoteRow } from '@/services/db/schema';

interface NotesModalProps {
  bookId: string | null;
  bookTitle: string;
  onClose: () => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Full-screen modal for viewing and editing notes attached to a book. */
export function NotesModal({ bookId, bookTitle, onClose }: NotesModalProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Swipe-right-to-close
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dx > 8 && Math.abs(gs.dy) < Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dx > 0) translateX.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > width * 0.35) {
          Animated.timing(translateX, {
            toValue: width,
            duration: 200,
            useNativeDriver: true,
          }).start(onClose);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  // Reset position when modal opens
  useEffect(() => {
    if (bookId) translateX.setValue(0);
  }, [bookId, translateX]);

  const reload = useCallback(() => {
    if (bookId) setNotes(getNotesForBook(bookId));
  }, [bookId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const startAdd = () => {
    setEditingId('__new__');
    setDraftText('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const startEdit = (note: NoteRow) => {
    setEditingId(note.id);
    setDraftText(note.text);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftText('');
  };

  const saveEdit = () => {
    const text = draftText.trim();
    if (!text || !bookId) {
      cancelEdit();
      return;
    }
    if (editingId === '__new__') {
      createNote(bookId, text);
    } else if (editingId) {
      updateNote(editingId, text);
    }
    setEditingId(null);
    setDraftText('');
    reload();
  };

  const handleDelete = (note: NoteRow) => {
    Alert.alert('Delete note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteNote(note.id);
          reload();
        },
      },
    ]);
  };

  return (
    <Modal visible={bookId !== null} animationType="slide" onRequestClose={onClose}>
      <Animated.View
        style={{ flex: 1, backgroundColor: '#fff', transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {/* Safe-area top spacer */}
        <View style={{ height: insets.top, backgroundColor: '#fff' }} />

        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray-100">
          <Text className="text-base font-bold text-gray-900 flex-1 mr-3" numberOfLines={1}>
            Notes · {bookTitle}
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

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={insets.top}
        >
          {/* Notes list */}
          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            ListEmptyComponent={
              editingId !== '__new__' ? (
                <View className="items-center py-16">
                  <Text className="text-3xl mb-2">📝</Text>
                  <Text className="text-gray-400 text-sm">No notes yet</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) =>
              editingId === item.id ? (
                <View className="rounded-xl border border-blue-300 bg-blue-50 p-3">
                  <TextInput
                    ref={inputRef}
                    value={draftText}
                    onChangeText={setDraftText}
                    multiline
                    autoFocus
                    className="text-sm text-gray-900 min-h-[60px]"
                    placeholderTextColor="#9ca3af"
                  />
                  <View className="flex-row justify-end gap-2 mt-2">
                    <Pressable onPress={cancelEdit} className="px-3 py-1.5 rounded-lg bg-gray-200">
                      <Text className="text-xs font-medium text-gray-600">Cancel</Text>
                    </Pressable>
                    <Pressable onPress={saveEdit} className="px-3 py-1.5 rounded-lg bg-blue-500">
                      <Text className="text-xs font-semibold text-white">Save</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View className="rounded-xl bg-gray-50 p-3">
                  <Text className="text-sm text-gray-800 leading-relaxed">{item.text}</Text>
                  <View className="flex-row items-center justify-between mt-2">
                    <Text className="text-[11px] text-gray-400">{formatDate(item.createdAt)}</Text>
                    <View className="flex-row gap-3">
                      <Pressable
                        onPress={() => startEdit(item)}
                        accessibilityRole="button"
                        className="active:opacity-50"
                      >
                        <Text className="text-xs text-blue-500 font-medium">Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(item)}
                        accessibilityRole="button"
                        className="active:opacity-50"
                      >
                        <Text className="text-xs text-red-400 font-medium">Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )
            }
            ListFooterComponent={
              editingId === '__new__' ? (
                <View className="rounded-xl border border-blue-300 bg-blue-50 p-3 mt-3">
                  <TextInput
                    ref={inputRef}
                    value={draftText}
                    onChangeText={setDraftText}
                    multiline
                    placeholder="Write your note…"
                    placeholderTextColor="#9ca3af"
                    className="text-sm text-gray-900 min-h-[80px]"
                  />
                  <View className="flex-row justify-end gap-2 mt-2">
                    <Pressable onPress={cancelEdit} className="px-3 py-1.5 rounded-lg bg-gray-200">
                      <Text className="text-xs font-medium text-gray-600">Cancel</Text>
                    </Pressable>
                    <Pressable onPress={saveEdit} className="px-3 py-1.5 rounded-lg bg-blue-500">
                      <Text className="text-xs font-semibold text-white">Save</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null
            }
          />

          {/* Add note button */}
          {editingId === null && (
            <Pressable
              onPress={startAdd}
              accessibilityRole="button"
              accessibilityLabel="Add note"
              style={{ marginBottom: insets.bottom + 8 }}
              className="mx-4 rounded-xl bg-blue-500 py-3 items-center active:bg-blue-600"
            >
              <Text className="text-sm font-semibold text-white">+ Add note</Text>
            </Pressable>
          )}
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}
