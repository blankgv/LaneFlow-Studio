export interface DepartmentPayload {
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
}
