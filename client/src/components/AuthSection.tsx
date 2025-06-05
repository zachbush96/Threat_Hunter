import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";

export function AuthSection() {
  const { user, signOut } = useUser();

  if (!user) {
    return (
      <a href="/auth/google">
        <Button variant="outline">Sign in with Google</Button>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{user.username || user.email}</span>
      <Button variant="outline" size="sm" onClick={signOut}>
        Logout
      </Button>
    </div>
  );
}
