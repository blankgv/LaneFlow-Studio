export interface User {
  id: string;
  username: string;
  email: string;
  staffId: string | null;
  staffCode: string | null;
  staffFullName: string | null;
  roleId: string;
  roleCode: string;
  roleName: string;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
  lastLoginAt: string | null;
}
