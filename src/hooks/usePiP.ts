import { useState, useCallback, useRef, useEffect } from 'react';

export function usePiP() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const pipContainerRef = useRef<HTMLDivElement | null>(null);

  const isSupported = 'documentPictureInPicture' in window;
  const isOpen = pipWindow !== null && !pipWindow.closed;

  const open = useCallback(async () => {
    // Document PiP API
    if ('documentPictureInPicture' in window) {
      try {
        const pip = await (window as unknown as DocumentPictureInPicture)
          .requestWindow({ width: 320, height: 120 });

        // Copy stylesheets into PiP window
        for (const sheet of document.styleSheets) {
          try {
            if (sheet.href) {
              const link = pip.document.createElement('link');
              link.rel = 'stylesheet';
              link.href = sheet.href;
              pip.document.head.appendChild(link);
            } else if (sheet.cssRules) {
              const style = pip.document.createElement('style');
              for (const rule of sheet.cssRules) {
                style.textContent += rule.cssText + '\n';
              }
              pip.document.head.appendChild(style);
            }
          } catch {
            // Cross-origin stylesheet, skip
          }
        }

        // Add PiP-specific meta
        const meta = pip.document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0';
        pip.document.head.appendChild(meta);
        pip.document.title = 'Task Timer';

        // Create container
        const container = pip.document.createElement('div');
        container.id = 'pip-root';
        pip.document.body.appendChild(container);
        pipContainerRef.current = container;

        pip.addEventListener('pagehide', () => {
          setPipWindow(null);
          pipContainerRef.current = null;
        });

        setPipWindow(pip);
      } catch (e) {
        console.error('Failed to open PiP window:', e);
      }
      return;
    }

    // Fallback: small popup window
    const popup = window.open(
      '',
      'task-timer-pip',
      'width=320,height=120,menubar=no,toolbar=no,location=no,status=no'
    );
    if (popup) {
      popup.document.title = 'Task Timer';

      for (const sheet of document.styleSheets) {
        try {
          if (sheet.href) {
            const link = popup.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            popup.document.head.appendChild(link);
          } else if (sheet.cssRules) {
            const style = popup.document.createElement('style');
            for (const rule of sheet.cssRules) {
              style.textContent += rule.cssText + '\n';
            }
            popup.document.head.appendChild(style);
          }
        } catch {
          // skip
        }
      }

      const container = popup.document.createElement('div');
      container.id = 'pip-root';
      popup.document.body.appendChild(container);
      pipContainerRef.current = container;

      popup.addEventListener('beforeunload', () => {
        setPipWindow(null);
        pipContainerRef.current = null;
      });

      setPipWindow(popup);
    }
  }, []);

  const close = useCallback(() => {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }
    setPipWindow(null);
    pipContainerRef.current = null;
  }, [pipWindow]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pipWindow && !pipWindow.closed) {
        pipWindow.close();
      }
    };
  }, [pipWindow]);

  return { isSupported: isSupported || true, isOpen, open, close, container: pipContainerRef };
}

// Type for the Document PiP API
interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
}
