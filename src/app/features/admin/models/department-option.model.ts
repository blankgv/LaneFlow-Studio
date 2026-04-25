export interface DepartmentOption {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
}
