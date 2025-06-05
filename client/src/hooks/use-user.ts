import { useEffect, useState } from "react";
import { getCurrentUser, User, logout } from "@/lib/openai";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  const signOut = async () => {
    await logout();
    setUser(null);
  };

  return { user, signOut };
}
