import { useState, useCallback, useRef, useEffect } from 'react';

export type PiPMode = 'closed' | 'pip' | 'popup' | 'overlay';

export function usePiP() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [mode, setMode] = useState<PiPMode>('closed');
  const pipContainerRef = useRef<HTMLDivElement | null>(null);

  const isOpen = mode !== 'closed';

  const copyStyles = (targetDoc: Document) => {
    for (const sheet of document.styleSheets) {
      try {
        if (sheet.href) {
          const link = targetDoc.createElement('link');
          link.rel = 'stylesheet';
          link.href = sheet.href;
          targetDoc.head.appendChild(link);
        } else if (sheet.cssRules) {
          const style = targetDoc.createElement('style');
          for (const rule of sheet.cssRules) {
            style.textContent += rule.cssText + '\n';
          }
          targetDoc.head.appendChild(style);
        }
      } catch {
        // Cross-origin stylesheet, skip
      }
    }
  };

  const open = useCallback(async () => {
    // 1. Try Document PiP API (Chrome 116+)
    if ('documentPictureInPicture' in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dpip = (window as any).documentPictureInPicture;
        const pip: Window = await dpip.requestWindow({ width: 320, height: 120 });

        copyStyles(pip.document);

        const meta = pip.document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0';
        pip.document.head.appendChild(meta);
        pip.document.title = 'Task Timer';

        const container = pip.document.createElement('div');
        container.id = 'pip-root';
        pip.document.body.appendChild(container);
        pipContainerRef.current = container;

        pip.addEventListener('pagehide', () => {
          setPipWindow(null);
          setMode('closed');
          pipContainerRef.current = null;
        });

        setPipWindow(pip);
        setMode('pip');
        return;
      } catch (e) {
        console.warn('Document PiP failed, trying popup:', e);
      }
    }

    // 2. Try popup window
    try {
      const popup = window.open(
        '',
        'task-timer-pip',
        'width=320,height=140,menubar=no,toolbar=no,location=no,status=no'
      );
      if (popup) {
        popup.document.title = 'Task Timer';
        copyStyles(popup.document);

        const container = popup.document.createElement('div');
        container.id = 'pip-root';
        popup.document.body.appendChild(container);
        pipContainerRef.current = container;

        popup.addEventListener('beforeunload', () => {
          setPipWindow(null);
          setMode('closed');
          pipContainerRef.current = null;
        });

        setPipWindow(popup);
        setMode('popup');
        return;
      }
    } catch (e) {
      console.warn('Popup failed, using overlay:', e);
    }

    // 3. Fallback: in-page overlay (always works)
    setMode('overlay');
  }, []);

  const close = useCallback(() => {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }
    setPipWindow(null);
    setMode('closed');
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

  return { isOpen, mode, open, close, container: pipContainerRef };
}
