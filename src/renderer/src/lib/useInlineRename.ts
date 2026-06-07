import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

// Double-click-to-rename state machine shared by the group/meta-group cards.
// Mirrors the external `currentName`, selects the text when editing begins,
// commits a trimmed value (reverting to the original if blank), and exposes
// `inputProps` to spread onto the edit <input>.
export function useInlineRename(
  currentName: string,
  onCommit: (name: string) => void,
) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(currentName);
  }, [currentName]);

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  const start = useCallback(() => setIsEditing(true), []);

  const commit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed) onCommit(trimmed);
    else setValue(currentName);
    setIsEditing(false);
  }, [value, currentName, onCommit]);

  const cancel = useCallback(() => {
    setValue(currentName);
    setIsEditing(false);
  }, [currentName]);

  const inputProps = {
    ref: inputRef,
    value,
    onChange: (e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
    onBlur: commit,
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") commit();
      else if (e.key === "Escape") cancel();
    },
  };

  return { isEditing, start, inputProps };
}
