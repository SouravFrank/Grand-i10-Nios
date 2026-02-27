import type { AppUser } from '@/types/models';

export const AUTH_HASH_PEPPER = 'grandi10-nios-app-pepper-v1';

export type AllowedUser = {
  id: AppUser['id'];
  name: AppUser['name'];
  credentialHash: string;
};

// Exactly two users are allowed to authenticate in this app.
export const ALLOWED_USERS: [AllowedUser, AllowedUser] = [
  {
    id: 'owner',
    name: 'Owner',
    credentialHash: 'a920ef7d76d3398803a26bb39a8d452161684aa21e0b3cadcf21b1f0be52e85f',
  },
  {
    id: 'coDriver',
    name: 'Co-Driver',
    credentialHash: '92a378acb21ddf3f773e07f163e1b0fad2ac9583430fff4be95d3cbd7645bf1a',
  },
];
