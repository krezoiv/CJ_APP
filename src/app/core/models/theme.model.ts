/** "Modo Claro / Modo Oscuro" — preferencia individual del usuario, persistida en `users.theme` (backend). */
export type ThemePreference = 'LIGHT' | 'DARK';

export interface ThemePreferencesResponse {
  theme: ThemePreference;
}
