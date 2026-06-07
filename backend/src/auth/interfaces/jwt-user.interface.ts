import { Role } from '@flavohub/shared';

export interface JwtUser {
  id: string;
  email: string;
  role: Role;
}
