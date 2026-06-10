import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { useTheme } from '@mui/material';
import { useEffect, useRef } from 'react';

interface UseCodeMirrorOptions {
  editable: boolean;
  initialText: string;
  onDocChange: (doc: string) => void;
}

interface UseCodeMirrorResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewRef: React.RefObject<EditorView | null>;
}

const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export function useCodeMirror({
  editable,
  initialText,
  onDocChange,
}: UseCodeMirrorOptions): UseCodeMirrorResult {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (parent === null) return;

    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: initialText,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.editable.of(editable),
          EditorState.readOnly.of(!editable),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onDocChange(update.state.doc.toString());
            }
          }),
          EditorView.theme(
            {
              '.cm-activeLine': { backgroundColor: theme.palette.action.hover },
              '.cm-activeLineGutter': {
                backgroundColor: theme.palette.action.hover,
              },
              '.cm-content': {
                caretColor: theme.palette.text.primary,
                fontFamily: FONT_MONO,
              },
              '.cm-cursor': { borderLeftColor: theme.palette.text.primary },
              '.cm-gutters': {
                backgroundColor: theme.palette.background.default,
                border: 'none',
                color: theme.palette.text.secondary,
              },
              '&': {
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                height: '100%',
              },
              '&.cm-focused': { outline: 'none' },
            },
            { dark: theme.palette.mode === 'dark' },
          ),
        ],
      }),
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [editable, initialText, onDocChange, theme]);

  return { containerRef, viewRef };
}
