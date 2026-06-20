import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "employee";

export function useRequireRole(required: Role) {
  const navigate = useNavigate();
  const [state, setState] = useState<{ checking: boolean; name: string }>({
    checking: true,
    name: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (!cancelled) navigate({ to: "/login", replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!profile) {
        await supabase.auth.signOut();
        navigate({ to: "/login", replace: true });
        return;
      }
      if (profile.role !== required) {
        navigate({
          to: profile.role === "admin" ? "/admin/dashboard" : "/employee/home",
          replace: true,
        });
        return;
      }
      setState({ checking: false, name: profile.name });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, required]);

  return state;
}
