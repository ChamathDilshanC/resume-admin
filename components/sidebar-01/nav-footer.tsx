"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogOut, HardDrive, BookOpen, Images } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const driveFileId = process.env.NEXT_PUBLIC_GDRIVE_FILE_ID;

export function NavFooter() {
  const { data: session } = useSession();
  const user = session?.user;
  const initials = (user?.name || "?").slice(0, 2).toUpperCase();

  return (
    <SidebarFooter className="p-3">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            render={<Link href="/dashboard/docs" />}
            tooltip="How the project pipeline works"
          >
            <BookOpen className="opacity-80" />
            <span>Docs</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            render={<Link href="/dashboard/drive" />}
            tooltip="Browse every project's Drive mockups in one gallery"
          >
            <Images className="opacity-80" />
            <span>Project Drive</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {driveFileId && (
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <a
                  href={`https://drive.google.com/file/d/${driveFileId}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              tooltip="View the live PDF on Google Drive"
            >
              <HardDrive className="opacity-80" />
              <span>Resume PDF</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
      <SidebarSeparator className="my-1" />
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              nativeButton={true}
              render={
                <button className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-sidebar-accent" />
              }
            >
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage alt={user?.name ?? ""} src={user?.image ?? undefined} />
                <AvatarFallback className="rounded-full text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user?.name || "Signed in"}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Signed in as {user?.name}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/signin" })}>
                <LogOut aria-hidden="true" className="opacity-80" size={16} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
