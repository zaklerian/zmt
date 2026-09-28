export interface SenderFrame {
  readonly parent: null | SenderFrame;
  readonly url: string;
}

export interface SenderEvent {
  readonly senderFrame: null | SenderFrame;
}

export function originOf(url: string): null | string {
  try {
    const parsed = new URL(url);
    return parsed.host === '' ? null : `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

export function isTrustedSender(event: SenderEvent, appOrigin: string): boolean {
  const frame = event.senderFrame;
  if (frame?.parent !== null) {
    return false;
  }
  return originOf(frame.url) === appOrigin;
}
