export interface User {
  id: string;
  username: string;
  phone: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  username: string;
  phone: string;
  password: string;
  roleId: string;
}

/** All fields optional — PATCH only sends what changed. `password` is only sent when the admin sets a new one. */
export interface UpdateUserInput {
  username?: string;
  phone?: string;
  roleId?: string;
  isActive?: boolean;
  password?: string;
}
