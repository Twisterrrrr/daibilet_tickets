export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: 'Админ' | 'Контент' | 'Поддержка' | 'Только чтение';
  lastLoginAt: string | null;
}

const ROWS: AdminUserRow[] = [
  {
    id: 'u-1',
    name: 'Алексей Орлов',
    email: 'a.orlov@example.com',
    role: 'Админ',
    lastLoginAt: '2025-03-24T07:00:00.000Z',
  },
  {
    id: 'u-2',
    name: 'Марина Соколова',
    email: 'm.sokolova@example.com',
    role: 'Контент',
    lastLoginAt: '2025-03-22T11:30:00.000Z',
  },
  {
    id: 'u-3',
    name: 'Гость CI',
    email: 'ci@example.com',
    role: 'Только чтение',
    lastLoginAt: null,
  },
];

export function getMockAdminUsers(): AdminUserRow[] {
  return [...ROWS];
}
