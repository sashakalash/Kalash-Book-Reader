import { Component } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Called when user taps "Go back" */
  onBack: () => void;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Error boundary for reader screens — catches EPUB/PDF render crashes
 * and shows a recoverable UI instead of a blank screen.
 */
export class ReaderErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  override render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center bg-black px-8">
        <Text className="text-4xl mb-4">📖</Text>
        <Text className="text-white text-base font-semibold mb-2 text-center">
          Could not open this book
        </Text>
        <Text className="text-gray-400 text-sm text-center mb-8">{this.state.message}</Text>
        <Pressable
          onPress={this.props.onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back to library"
          className="rounded-xl bg-white px-6 py-3 active:opacity-70"
        >
          <Text className="text-sm font-semibold text-black">Go back to library</Text>
        </Pressable>
      </View>
    );
  }
}
