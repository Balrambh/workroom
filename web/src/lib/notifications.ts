export const ALERTS_KEY = 'roomforge.alerts';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function desktopAlertsEnabled(): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;
  try {
    return localStorage.getItem(ALERTS_KEY) === 'on';
  } catch {
    return false;
  }
}

export function setDesktopAlerts(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(ALERTS_KEY, 'on');
    else localStorage.removeItem(ALERTS_KEY);
  } catch {
    // private mode may reject storage; the permission prompt still works
  }
}

export function showMentionNotification(input: {
  sender: string;
  room: string;
  body: string;
  onClick: () => void;
}): void {
  if (!desktopAlertsEnabled()) return;
  const text = input.body.length > 140 ? `${input.body.slice(0, 139)}…` : input.body;
  try {
    const notification = new Notification(`${input.sender} in #${input.room}`, {
      body: text,
      tag: `roomforge-mention-${input.room}`,
    });
    notification.onclick = () => {
      window.focus();
      input.onClick();
      notification.close();
    };
  } catch {
    // some browsers only allow page-scoped notifications; ignore failures
  }
}
