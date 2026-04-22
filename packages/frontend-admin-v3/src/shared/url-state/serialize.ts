export function setOrDelete(sp: URLSearchParams, key: string, value: string | null | undefined) {
  if (value == null || value === '') sp.delete(key);
  else sp.set(key, value);
}

export function setBool01(sp: URLSearchParams, key: string, value: boolean | undefined, defaultValue?: boolean) {
  if (value === undefined) {
    sp.delete(key);
    return;
  }
  if (defaultValue !== undefined && value === defaultValue) {
    sp.delete(key);
    return;
  }
  sp.set(key, value ? '1' : '0');
}

export function setCsv(sp: URLSearchParams, key: string, values: string[] | undefined, defaultValues?: string[]) {
  const v = Array.isArray(values) ? values : [];
  if (v.length === 0) {
    sp.delete(key);
    return;
  }
  if (defaultValues && Array.isArray(defaultValues) && v.join(',') === defaultValues.join(',')) {
    sp.delete(key);
    return;
  }
  sp.set(key, v.join(','));
}

