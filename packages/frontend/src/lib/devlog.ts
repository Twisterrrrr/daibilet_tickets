export const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') console.warn(...args);
};

export const devWarn = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') console.warn(...args);
};

