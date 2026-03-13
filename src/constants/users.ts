import type { AppUser } from "@/types/models";

export const AUTH_HASH_PEPPER = "grandi10-nios-app-pepper-v1";

export type AllowedUser = {
  id: AppUser["id"];
  name: AppUser["name"];
  credentialHash: string;
};

// Exactly two users are allowed to authenticate in this app.
export const ALLOWED_USERS: [AllowedUser, AllowedUser] = [
  {
    id: "sourav",
    name: "Sourav", //-- 1998
    credentialHash:
      "36dde268c19c90750bca0fe7eefb5ebfe7b8a676df2639f48b999354409cb571",
  },
  {
    id: "ayan",
    name: "Ayan", //-- 1997
    credentialHash:
      "94f919635dec9527497a14684e4479b809391dc594c88fdc80651e165cb53f6b",
  },
];
