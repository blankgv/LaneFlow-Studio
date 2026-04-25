export interface AuthSession {
  token: string;
  username: string;
  roleCode: string;
  permissions: string[];
  expiresIn: number;
  loginAt: number;
}
