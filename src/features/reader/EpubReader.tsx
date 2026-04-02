import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
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
  /** Ref populated with goNext so the parent can implement tap-to-turn overlays. */
  pageForwardRef?: React.MutableRefObject<(() => void) | null>;
  /** Ref populated with goPrevious so the parent can implement tap-to-turn overlays. */
  pageBackRef?: React.MutableRefObject<(() => void) | null>;
}

// ---------------------------------------------------------------------------
// JS injected into the WebView to detect taps.
// Only handles tap detection for showing/hiding controls.
// Link navigation is handled natively by the library via onShouldStartLoadWithRequest.
// ---------------------------------------------------------------------------

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
      if (dx < 10 && dy < 10 && dt < 300 && (now - lastTap) > 350) {
        lastTap = now;
        var docWidth = doc.documentElement.clientWidth || window.innerWidth || 1;
        postFn(JSON.stringify({ type: 'tap', x: sx / docWidth }));
      }
    }, { passive: true });
  }

  function attachToIframe(iframe) {
    var tries = 0;
    var interval = setInterval(function() {
      tries++;
      try {
        var cd = iframe.contentDocument;
        if (cd && cd.readyState === 'complete' && cd.body) {
          clearInterval(interval);
          makeTapListener(cd, function(msg) {
            window.ReactNativeWebView.postMessage(msg);
          });
        }
      } catch(e) { clearInterval(interval); }
      if (tries > 50) clearInterval(interval);
    }, 100);
  }

  document.querySelectorAll('iframe').forEach(attachToIframe);

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
  pageForwardRef,
  pageBackRef,
}: EpubReaderInnerProps) {
  const { goToLocation, injectJavascript } = useReader();
  const { initialPosition, savePosition } = useReadingPosition(bookId);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const didRestore = useRef(false);
  const locationsReady = useRef(false);
  const webViewReady = useRef(false);
  const currentCfiRef = useRef<string | null>(initialPosition?.cfi ?? null);
  const prevFlowRef = useRef(settings.flow);
  const pendingScript = useRef<string | null>(null);
  const injectRef = useRef(injectJavascript);
  injectRef.current = injectJavascript;
  const goToLocationRef = useRef(goToLocation);
  goToLocationRef.current = goToLocation;
  const onSingleTapRef = useRef(onSingleTap);
  onSingleTapRef.current = onSingleTap;
  const onProgressChangeRef = useRef(onProgressChange);
  onProgressChangeRef.current = onProgressChange;
  const settingsFlowRef = useRef(settings.flow);
  settingsFlowRef.current = settings.flow;

  // Reset WebView/location state when flow changes (Reader remounts via key)
  if (prevFlowRef.current !== settings.flow) {
    prevFlowRef.current = settings.flow;
    locationsReady.current = false;
    didRestore.current = false;
    webViewReady.current = false;
  }

  /** Inject JS into WebView, queuing if it's not ready yet. */
  const safeInject = useCallback((script: string) => {
    if (webViewReady.current) {
      injectRef.current(script);
    } else {
      pendingScript.current = script;
    }
  }, []);

  // Expose navigate + seek + page-turn refs
  useEffect(() => {
    if (navigateRef) {
      navigateRef.current = (href: string) => {
        const escaped = href.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        // Resolve TOC href through the spine (tries multiple path variations)
        // then display. Direct rendition.display(href) often silently fails
        // because TOC hrefs don't match the spine's internal paths.
        injectRef.current(`
          (function(){
            try {
              var h = '${escaped}';
              var noHash = h.split('#')[0];
              var s = book.spine.get(noHash)
                   || book.spine.get(noHash.split('/').pop())
                   || book.spine.get(noHash.split('/').slice(1).join('/'));
              if (s) { rendition.display(s.href); }
              else   { rendition.display(h); }
            } catch(e) { rendition.display('${escaped}'); }
          })(); true;
        `);
      };
    }
    if (seekRef) {
      seekRef.current = (pct: number) => {
        safeInject(
          `(function(){ var cfi = book.locations.cfiFromPercentage(${pct}); if(cfi) rendition.display(cfi); })(); true;`,
        );
      };
    }
    if (pageForwardRef) {
      // Inject rendition.next() directly — same mechanism as all other injections,
      // bypasses the library's context chain which can silently no-op.
      pageForwardRef.current = () => injectRef.current('rendition.next(); true;');
    }
    if (pageBackRef) {
      pageBackRef.current = () => injectRef.current('rendition.prev(); true;');
    }
  }, [navigateRef, seekRef, pageForwardRef, pageBackRef, safeInject]);

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
        // Always 100% width — padding provides horizontal margins.
        // Setting width < 100% in paginated mode breaks epubjs column-width
        // calculation and prevents rendition.next() from navigating.
        width: '100%',
        'max-width': '100%',
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
    ],
  );

  const handleReady = useCallback(() => {
    webViewReady.current = true;

    // Fix scroll mode: the template sets
    //   #viewer { overflow: hidden !important; display: flex; align-items: center }
    // which clips scrollable content and centers small covers.
    // Keep changes minimal — epubjs manages iframe/section sizes itself,
    // so only fix the outer viewer container and inject image CSS into content.
    if (settings.flow === 'scrolled-doc') {
      injectRef.current(`
        (function() {
          var s = document.createElement('style');
          s.textContent = '#viewer { overflow-y: auto !important; display: block !important; -webkit-overflow-scrolling: touch !important; }';
          document.head.appendChild(s);

          // Make cover images responsive inside each chapter iframe.
          function applyImageFix(contents) {
            if (!contents || !contents.document) return;
            var style = contents.document.createElement('style');
            // width: 100% forces small cover images to fill viewport width
            style.textContent = 'img, svg { width: 100% !important; max-width: 100% !important; height: auto !important; }';
            contents.document.head.appendChild(style);
          }
          try {
            rendition.hooks.content.register(function(c) { applyImageFix(c); });
            rendition.getContents().forEach(applyImageFix);
          } catch(e) {}
        })(); true;
      `);
    }

    // Regenerate locations with fine granularity (150 chars) for accurate progress.
    // The library template generates with 1600 chars which is way too coarse.
    // We wait for the template's initial generate to finish (via book.ready),
    // then overwrite with our finer granularity.
    injectRef.current(`
      book.ready.then(function() {
        return book.locations.generate(150);
      }).then(function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'locationsReady'}));
      });
      true;
    `);

    // Set up link click interception via epubjs content hooks.
    injectRef.current(`
      (function() {
        var post = window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView);
        function interceptLinks(doc) {
          if (!doc || doc._rnLinks) return;
          doc._rnLinks = true;
          doc.addEventListener('click', function(e) {
            var el = e.target;
            while (el && el.tagName !== 'A') el = el.parentElement;
            if (!el) return;
            var href = el.getAttribute('href');
            if (!href) return;
            e.preventDefault();
            e.stopPropagation();
            post(JSON.stringify({ type: 'link', href: href }));
          }, true);
        }
        try {
          rendition.hooks.content.register(function(contents) {
            interceptLinks(contents.document);
          });
          rendition.getContents().forEach(function(c) {
            interceptLinks(c.document);
          });
        } catch(e) {}
      })();
      true;
    `);

    // Flush any navigation queued before WebView was ready
    if (pendingScript.current) {
      injectRef.current(pendingScript.current);
      pendingScript.current = null;
    }
  }, [settings.flow]);

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
      // Ignore progress events until our fine-grained locations are ready
      if (!locationsReady.current) return;

      const cfi = currentLocation?.start?.cfi;
      // Template always sends Math.floor(percent * 100) i.e. integer 0–100.
      const pct = Math.min(1, Math.max(0, (progress ?? 0) / 100));

      if (cfi) currentCfiRef.current = cfi;
      onProgressChangeRef.current?.(pct);
      savePosition({
        cfi: cfi ?? null,
        chapterIndex: currentLocation?.start?.displayed?.page ?? null,
        percentage: pct,
        textAnchor: null,
      });
    },
    [savePosition],
  );

  const handleWebViewMessage = useCallback(
    (event: { type?: string; href?: string; x?: number }) => {
      if (event?.type === 'tap') {
        if (settingsFlowRef.current === 'paginated' && event.x !== undefined) {
          if (event.x < 0.3) {
            safeInject('rendition.prev(); true;');
          } else if (event.x > 0.7) {
            safeInject('rendition.next(); true;');
          } else {
            onSingleTapRef.current?.();
          }
          return;
        }
        onSingleTapRef.current?.();
        return;
      }
      if (event?.type === 'link' && event.href) {
        const href = event.href;
        if (/^https?:\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')) {
          Linking.openURL(href);
        } else {
          goToLocationRef.current(href);
        }
        return;
      }
      if (event?.type === 'locationsReady') {
        locationsReady.current = true;
        if (!didRestore.current && initialPosition?.cfi) {
          goToLocationRef.current(initialPosition.cfi);
          didRestore.current = true;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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
        initialLocation={currentCfiRef.current ?? initialPosition?.cfi ?? undefined}
        flow={settings.flow}
        manager={settings.flow === 'scrolled-doc' ? 'continuous' : 'default'}
        enableSwipe={settings.flow === 'paginated'}
        onReady={handleReady}
        onNavigationLoaded={handleNavigationLoaded}
        onLocationChange={handleLocationChange}
        onPressExternalLink={(url) => Linking.openURL(url)}
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
  pageForwardRef?: React.MutableRefObject<(() => void) | null>;
  pageBackRef?: React.MutableRefObject<(() => void) | null>;
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
