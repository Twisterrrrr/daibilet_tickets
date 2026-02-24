declare global {
  interface Window {
    ym?: (counterId: number, action: string, params?: unknown) => void;
    __YM_ID__?: number;
  }
}

export {};
