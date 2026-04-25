export interface LoginResponse {
  token: string;
  username: string;
  roleCode: string;
  permissions: string[];
  expiresIn: number;
}
