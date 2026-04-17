let _dirty = false;
let _message = "작업 중인 내용이 있습니다. 페이지를 떠나면 저장되지 않습니다.";

export function setUnsavedChanges(dirty: boolean, message?: string) {
  _dirty = dirty;
  if (message) _message = message;
}

export function hasUnsavedChanges() {
  return _dirty;
}

export function getUnsavedMessage() {
  return _message;
}
