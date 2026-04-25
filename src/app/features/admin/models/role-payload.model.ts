export interface RolePayload {
  code: string;
  name: string;
  description: string | null;
  permissions: string[];
}
