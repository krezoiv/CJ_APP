export interface Role {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  usersCount: number;
  createdAt: string;
  updatedAt: string;
}

/** The three seeded roles — the backend rejects renaming any of these, so the UI locks the name field for them too. */
export const SYSTEM_ROLE_NAMES: readonly string[] = ['SUPER_ADMIN', 'ADMIN', 'USER'];

export interface CreateRoleInput {
  name: string;
  description?: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}
