const KEY = 'admin-v3:sidebar';

export type SidebarState = {
  collapsed: boolean;
};

export function readSidebarState(): SidebarState {
  if (typeof window === 'undefined') return { collapsed: false };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { collapsed: false };
    const parsed = JSON.parse(raw) as SidebarState;
    return { collapsed: Boolean(parsed.collapsed) };
  } catch {
    return { collapsed: false };
  }
}

export function writeSidebarState(state: SidebarState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

