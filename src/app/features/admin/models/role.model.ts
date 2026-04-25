export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissions: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
}
