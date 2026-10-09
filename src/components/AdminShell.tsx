import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BookOpen, ClipboardList, LayoutDashboard, LogOut, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const nav = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/admin/employees", label: "Employees", icon: Users },
] as const;

const SIDEBAR_COOKIE = "sidebar_state";

/**
 * The sidebar primitive stores its open state in a cookie. Reading it before the
 * first paint keeps the rail from flashing open and then collapsing — this shell
 * only mounts after the role check, which renders nothing, so there is no SSR
 * pass to disagree with.
 */
function sidebarDefaultOpen() {
  if (typeof document === "undefined") return true;
  const match = document.cookie.match(new RegExp(`(?:^|; )${SIDEBAR_COOKIE}=([^;]*)`));
  return match ? match[1] !== "false" : true;
}

export function AdminShell({ children, name }: { children: ReactNode; name?: string }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = nav.find((item) => pathname.startsWith(item.to));

  async function signOut() {
    await supabase.auth.signOut({ scope: "local" });
    navigate({ to: "/login" });
  }

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen()}>
      <Sidebar collapsible="icon" className="border-steel">
        <SidebarHeader className="h-16 justify-center px-4">
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-2 rounded-md text-heading-3 font-semibold text-ink"
          >
            {/* A billet of steel, tempered blue: the mark stays legible in the collapsed rail. */}
            <span aria-hidden className="inline-block size-5 shrink-0 rounded-sm bg-temper-blue" />
            <span className="truncate group-data-[collapsible=icon]:hidden">SkillForge</span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    {/* Tooltips carry the labels once the rail collapses to icons. */}
                    <SidebarMenuButton asChild isActive={item === current} tooltip={item.label}>
                      <Link to={item.to}>
                        <item.icon aria-hidden />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-2 p-2">
          {name && (
            <p className="truncate px-2 text-small text-ink-muted group-data-[collapsible=icon]:hidden">
              {name}
            </p>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={signOut} tooltip="Sign out">
                <LogOut aria-hidden />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-ground">
        {/*
         * The bar carries the controls, not the page name: each page already
         * states that in its own heading, and printing it twice says nothing.
         */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-steel bg-ground px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6 bg-steel" />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="min-w-0 px-4 py-8 md:px-8">{children}</main>
        {/* One toaster for the whole admin: see DESIGN.md → "Toast". */}
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}
