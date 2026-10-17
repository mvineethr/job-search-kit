'use client';

import { useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';

/**
 * Text that becomes an input in the same spot when clicked. Enter or clicking away
 * commits; Escape restores the saved text. Line breaks are collapsed: no résumé
 * field needs one, and textareas are only there so long bullets wrap.
 */
export default function EditableText({
  value,
  label,
  onCommit,
  onCancel,
  multiline = false,
  placeholder = '',
  render,
  startEditing = false,
}: {
  value: string;
  label: string;
  onCommit: (v: string) => void;
  onCancel?: () => void;
  multiline?: boolean;
  placeholder?: string;
  render?: (v: string) => ReactNode;
  startEditing?: boolean;
}) {
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);

  if (!editing) {
    const start = () => {
      setDraft(value);
      setEditing(true);
    };
    return (
      <span
        className="editable"
        role="button"
        tabIndex={0}
        title={`Edit ${label}`}
        onClick={start}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            start();
          }
        }}
      >
        {value ? (render ? render(value) : value) : <span className="edit-placeholder edit-only">{placeholder || `+ ${label}`}</span>}
      </span>
    );
  }

  const finish = () => {
    setEditing(false);
    if (cancelled.current) {
      cancelled.current = false;
      onCancel?.();
      return;
    }
    const v = draft.replace(/\s+/g, ' ').trim();
    if (v !== value) onCommit(v);
    else onCancel?.();
  };

  const props = {
    autoFocus: true,
    'aria-label': label,
    className: 'edit-field',
    value: draft,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: finish,
    onKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelled.current = true;
        e.currentTarget.blur();
      } else if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
  };
  return multiline ? <textarea {...props} rows={Math.max(2, Math.ceil(draft.length / 80))} /> : <input {...props} />;
}
