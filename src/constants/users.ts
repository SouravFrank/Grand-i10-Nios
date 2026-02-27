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
    name: "Sourav",
    credentialHash:
      "a575e368fdca5294e5b36da8bc98b8d87a10561d61743a64fe02dfe48a23f3b5",
  },
  {
    id: "ayan",
    name: "Ayan",
    credentialHash:
      "fd47483080469c8cef5b68b8b4eb10ce93c8a5afcd812aeb4497d74413fbc099",
  },
];
