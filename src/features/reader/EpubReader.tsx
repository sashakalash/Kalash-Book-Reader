import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Reader, useReader, ReaderProvider } from '@epubjs-react-native/core';
import { useEpubFileSystem } from './useEpubFileSystem';

import { useReadingPosition } from '@/hooks/useReadingPosition';
import type { ReaderSettings } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EpubTocItem {
  id: string;
  href: string;
  label: string;
  subitems?: EpubTocItem[];
}

interface EpubReaderInnerProps {
  bookId: string;
  fileUri: string;
  settings: ReaderSettings;
  onTocReady: (toc: EpubTocItem[]) => void;
  onProgressChange?: (progress: number) => void;
  onSingleTap?: () => void;
  /** Ref populated with goToLocation so the parent can trigger TOC navigation. */
  navigateRef?: React.MutableRefObject<((href: string) => void) | null>;
  /** Ref populated with a seek-to-percentage function. */
  seekRef?: React.MutableRefObject<((pct: number) => void) | null>;
}

// ---------------------------------------------------------------------------
// JS injected into the WebView to detect taps reliably.
// Sends { type: 'tap' } via postMessage when a touch ends with minimal movement.
// ---------------------------------------------------------------------------

// Injected into the WebView after epubjs renders.
// epubjs renders each chapter inside an <iframe>, so we must attach listeners
// both to the outer document AND to the iframe's contentDocument.
// Inside the iframe, window.top.ReactNativeWebView is used because the bridge
// is only injected into the top frame.
const INJECT_TAP_DETECTOR = `
(function() {
  var lastTap = 0;
  function makeTapListener(doc, postFn) {
    var sx = 0, sy = 0, st = 0;
    doc.addEventListener('touchstart', function(e) {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      st = Date.now();
    }, { passive: true });
    doc.addEventListener('touchend', function(e) {
      var dx = Math.abs(e.changedTouches[0].clientX - sx);
      var dy = Math.abs(e.changedTouches[0].clientY - sy);
      var dt = Date.now() - st;
      var now = Date.now();
      // tap = small movement, short duration, not too soon after last tap
      if (dx < 10 && dy < 10 && dt < 300 && (now - lastTap) > 350) {
        lastTap = now;
        postFn(JSON.stringify({ type: 'tap' }));
      }
    }, { passive: true });
  }

  function attachToIframe(iframe) {
    var tries = 0;
    var interval = setInterval(function() {
      tries++;
      var cd = iframe.contentDocument;
      if (cd && cd.readyState === 'complete' && cd.body) {
        clearInterval(interval);
        makeTapListener(cd, function(msg) {
          window.ReactNativeWebView.postMessage(msg);
        });
      }
      if (tries > 50) clearInterval(interval);
    }, 100);
  }

  // Attach to all current iframes
  document.querySelectorAll('iframe').forEach(attachToIframe);

  // Watch for new iframes (epubjs creates them per chapter)
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(n) {
        if (n.nodeName === 'IFRAME') attachToIframe(n);
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  true;
})();
`;

// ---------------------------------------------------------------------------
// Inner component — must be inside <ReaderProvider>
// ---------------------------------------------------------------------------

function EpubReaderInner({
  bookId,
  fileUri,
  settings,
  onTocReady,
  onProgressChange,
  onSingleTap,
  navigateRef,
  seekRef,
}: EpubReaderInnerProps) {
  const { injectJavascript } = useReader();
  const { initialPosition, savePosition } = useReadingPosition(bookId);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const didRestore = useRef(false);
  const locationsReady = useRef(false);
  const webViewReady = useRef(false);
  const pendingScript = useRef<string | null>(null);
  const injectRef = useRef(injectJavascript);
  injectRef.current = injectJavascript;
  const onSingleTapRef = useRef(onSingleTap);
  onSingleTapRef.current = onSingleTap;
  const onProgressChangeRef = useRef(onProgressChange);
  onProgressChangeRef.current = onProgressChange;

  /** Inject JS into WebView, queuing if it's not ready yet. */
  const safeInject = useCallback((script: string) => {
    if (webViewReady.current) {
      injectRef.current(script);
    } else {
      pendingScript.current = script;
    }
  }, []);

  // Expose navigate + seek refs
  useEffect(() => {
    if (navigateRef) {
      navigateRef.current = (href: string) => {
        safeInject(`rendition.display(${JSON.stringify(href)}); true;`);
      };
    }
    if (seekRef) {
      seekRef.current = (pct: number) => {
        safeInject(
          `(function(){ var cfi = book.locations.cfiFromPercentage(${pct}); if(cfi) rendition.display(cfi); })(); true;`,
        );
      };
    }
  }, [navigateRef, seekRef, safeInject]);

  const fontFamilyMap: Record<ReaderSettings['fontFamily'], string> = {
    system: '-apple-system, BlinkMacSystemFont, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    'sans-serif': '"Helvetica Neue", Arial, sans-serif',
  };

  const bgMap: Record<ReaderSettings['theme'], string> = {
    day: '#ffffff',
    night: '#1a1a1a',
    sepia: '#f5e6c8',
  };

  const colorMap: Record<ReaderSettings['theme'], string> = {
    day: '#1a1a1a',
    night: '#e0e0e0',
    sepia: '#3b2d1e',
  };

  const isScrolled = settings.flow === 'scrolled-doc';

  const theme = useMemo(
    () => ({
      body: {
        background: bgMap[settings.theme],
        color: colorMap[settings.theme],
        'font-size': `${settings.fontSize}px`,
        'font-family': fontFamilyMap[settings.fontFamily],
        'line-height': String(settings.lineSpacing),
        margin: '0',
        padding: `8px ${settings.marginHorizontal}px 8px`,
        // In paginated mode epubjs manages column width; in scroll mode let
        // content fill the full viewport — padding handles horizontal spacing.
        ...(isScrolled
          ? { width: '100%', 'max-width': '100%' }
          : { width: '90%', 'max-width': '90%', margin: '0 auto' }),
        'overflow-x': 'hidden',
        'box-sizing': 'border-box',
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      settings.theme,
      settings.fontSize,
      settings.fontFamily,
      settings.lineSpacing,
      settings.marginHorizontal,
      isScrolled,
    ],
  );

  const handleReady = useCallback(() => {
    webViewReady.current = true;
    // Generate locations so progress % is accurate
    injectRef.current(
      'book.locations.generate(1024).then(function(){' +
        "  window.ReactNativeWebView.postMessage(JSON.stringify({type:'locationsReady'}));" +
        '}); true;',
    );
    // Flush any navigation queued before WebView was ready
    if (pendingScript.current) {
      injectRef.current(pendingScript.current);
      pendingScript.current = null;
    }
  }, []);

  const handleNavigationLoaded = useCallback(
    ({ toc }: { toc: EpubTocItem[] }) => {
      onTocReady(toc);
    },
    [onTocReady],
  );

  const handleLocationChange = useCallback(
    (
      _totalLocations: number,
      currentLocation: { start: { cfi: string; displayed: { page: number } } },
      progress: number,
    ) => {
      // Ignore progress events until book.locations.generate() has completed
      if (!locationsReady.current) return;
      // epubjs-react-native passes progress as 0–100, normalize to 0–1
      const raw = progress ?? 0;
      const pct = Math.min(1, Math.max(0, raw > 1 ? raw / 100 : raw));
      onProgressChangeRef.current?.(pct);
      savePosition({
        cfi: currentLocation?.start?.cfi ?? null,
        chapterIndex: currentLocation?.start?.displayed?.page ?? null,
        percentage: pct,
        textAnchor: null,
      });
    },
    [savePosition],
  );

  const handleWebViewMessage = useCallback((event: { type?: string }) => {
    if (event?.type === 'tap') {
      onSingleTapRef.current?.();
      return;
    }
    if (event?.type === 'locationsReady') {
      locationsReady.current = true;
      // Restore position now that locations are available
      if (!didRestore.current && initialPosition?.cfi) {
        injectRef.current(`rendition.display(${JSON.stringify(initialPosition.cfi)}); true;`);
        didRestore.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readerHeight = height - insets.top - insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: theme.body.background }]}>
      {/* Top safe-area spacer — keeps text below Dynamic Island / notch */}
      <View style={{ height: insets.top, backgroundColor: theme.body.background }} />
      <Reader
        key={settings.flow}
        src={fileUri}
        width={width}
        height={readerHeight}
        fileSystem={useEpubFileSystem}
        defaultTheme={theme}
        initialLocation={initialPosition?.cfi ?? undefined}
        flow={settings.flow}
        enableSwipe={settings.flow === 'paginated'}
        onReady={handleReady}
        onNavigationLoaded={handleNavigationLoaded}
        onLocationChange={handleLocationChange}
        injectedJavascript={INJECT_TAP_DETECTOR}
        onWebViewMessage={handleWebViewMessage}
        renderLoadingFileComponent={() => null}
        renderOpeningBookComponent={() => null}
      />
      {/* Bottom safe-area spacer */}
      <View style={{ height: insets.bottom, backgroundColor: theme.body.background }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Public component — wraps inner with ReaderProvider
// ---------------------------------------------------------------------------

interface EpubReaderProps {
  bookId: string;
  fileUri: string;
  settings: ReaderSettings;
  onTocReady: (toc: EpubTocItem[]) => void;
  onProgressChange?: (progress: number) => void;
  onSingleTap?: () => void;
  navigateRef?: React.MutableRefObject<((href: string) => void) | null>;
  seekRef?: React.MutableRefObject<((pct: number) => void) | null>;
}

/** EPUB reader — WebView-based via epubjs-react-native. */
export function EpubReader(props: EpubReaderProps) {
  return (
    <ReaderProvider>
      <EpubReaderInner {...props} />
    </ReaderProvider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
