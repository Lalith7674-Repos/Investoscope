"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { LogOut, ChevronDown } from "lucide-react";

type UserProfileProps = {
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
};

export default function UserProfile({ name, email, image }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const displayName = name || email?.split("@")[0] || "User";
  // Default avatar - using a default man photo from a placeholder service
  const defaultAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=default&style=circle&backgroundColor=transparent&accessories=[]&clothing=shirt&clothingColor=262e33&hair=short&hairColor=2c1810&skinColor=fdbcb4";
  const avatarUrl = image || defaultAvatar;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-sm"
      >
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-7 h-7 rounded-full border border-white/20 object-cover"
          onError={(e) => {
            // Fallback to a simple default if the image fails to load
            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ffffff' opacity='0.1' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='40' fill='%23ffffff'%3E👤%3C/text%3E%3C/svg%3E";
          }}
        />
        <span className="text-white hidden sm:inline-block max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 card border border-white/20 p-2 animate-fade-in z-50">
          <div className="px-3 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-10 h-10 rounded-full border border-white/20 object-cover"
                onError={(e) => {
                  // Fallback to a simple default if the image fails to load
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ffffff' opacity='0.1' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='40' fill='%23ffffff'%3E👤%3C/text%3E%3C/svg%3E";
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{displayName}</p>
                {email && (
                  <p className="text-xs text-white/60 truncate">{email}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="py-1">
            <button
              onClick={() => {
                signOut({ callbackUrl: "/" });
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

