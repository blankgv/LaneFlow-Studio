export interface Staff {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
}
