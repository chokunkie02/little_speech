"use client";

import ProfileMark from "@/components/ui/ProfileMark";

import { useState, useRef, useEffect } from "react";
import { useChildProfile } from "@/hooks/useChildProfile";
import { useSpeechProgress } from "@/hooks/useSpeechProgress";
import type { ChildProfileData } from "@/lib/child-profile/childProfileStorage";
import AddChildModal from "./AddChildModal";
import { useAuth } from "@/hooks/useAuth";

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

interface ChildSelectorProps {
  collapsed?: boolean;
}

export default function ChildSelector({ collapsed = false }: ChildSelectorProps) {
  const { profile, profiles, sharedProfiles, selectedChildId, isHydrated, selectChild } = useChildProfile();
  const { setSelectedSound, switchChildProgress } = useSpeechProgress();
  const { user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const options = wrapperRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
    const selected = Array.from(options ?? []).find((option) => option.getAttribute("aria-selected") === "true");
    (selected ?? options?.[0])?.focus();
  }, [open]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Don't render until hydrated (prevents SSR mismatch)
  if (!isHydrated || !profile) return null;

  const childName = profile.nickname || profile.name;

  function handleSelect(child: ChildProfileData) {
    selectChild(child.id);
    setSelectedSound(child.targetSound);
    switchChildProgress(child.id);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <div ref={wrapperRef} className="relative" onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (!open) { setOpen(true); return; }
          const options = Array.from(wrapperRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
          if (!options.length) return;
          const current = options.findIndex((option) => option === document.activeElement);
          const step = event.key === "ArrowDown" ? 1 : -1;
          const next = current < 0 ? (step > 0 ? 0 : options.length - 1) : (current + step + options.length) % options.length;
          options[next]?.focus();
        }
      }}>
        <button
          ref={triggerRef}
          onClick={() => setOpen((v) => !v)}
          className={collapsed
            ? "grid size-8 place-items-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
            : "w-full flex items-center gap-2 min-w-0 rounded-xl px-2 py-1.5 transition-all hover:bg-gray-100 dark:hover:bg-white/8 cursor-pointer"}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`เปลี่ยนเด็ก — กำลังเลือก ${childName}`}
        >
          <div className="w-7 h-7 rounded-full bg-primary/12 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
            <ProfileMark name={childName} avatar={profile.avatarEmoji} />
          </div>
          {!collapsed && <><span className="text-sm font-semibold text-text truncate flex-1 text-left">
            {childName}
          </span>
          <span className={`text-text-muted flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
            <ChevronDownIcon />
          </span></>}
        </button>

        {/* Dropdown */}
        {open && (
          <div
            role="listbox"
            aria-label="เลือกเด็ก"
            className={"absolute top-full left-0 mt-1 z-50 max-h-72 overflow-y-auto rounded-xl border border-border bg-surface shadow-lg " + (collapsed ? "w-56" : "right-0")}
          >
            {profiles.map((child) => {
              const isSelected = child.id === selectedChildId;
              return (
                <button
                  key={child.id}
                  role="option"
                  tabIndex={-1}
                  aria-selected={isSelected}
                  onClick={() => handleSelect(child)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${
                    isSelected
                      ? "bg-primary/8 text-primary font-semibold"
                      : "text-text hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isSelected ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
                  }`}>
                    <ProfileMark name={child.nickname || child.name} avatar={child.avatarEmoji} />
                  </div>
                  <span className="truncate flex-1">{child.nickname || child.name}</span>
                  {isSelected && (
                    <span className="flex-shrink-0 text-primary">
                      <CheckIcon />
                    </span>
                  )}
                </button>
              );
            })}

            {/* Shared children section */}
            {sharedProfiles.length > 0 && (
              <>
                <div className="px-3 py-1.5 border-t border-border">
                  <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">แชร์ให้ฉัน</span>
                </div>
                {sharedProfiles.map((child) => {
                  const isSelected = child.id === selectedChildId;
                  return (
                    <button
                      key={child.id}
                      role="option"
                  tabIndex={-1}
                      aria-selected={isSelected}
                      onClick={() => handleSelect(child)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${
                        isSelected
                          ? "bg-primary/8 text-primary font-semibold"
                          : "text-text hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isSelected ? "bg-primary/20 text-primary" : "bg-border/80 text-text-muted"
                      }`}>
                        <ProfileMark name={child.nickname || child.name} avatar={child.avatarEmoji} />
                      </div>
                      <span className="truncate flex-1">{child.nickname || child.name}</span>
                      <span className="text-[10px] text-text-muted flex-shrink-0">แชร์</span>
                      {isSelected && (
                        <span className="flex-shrink-0 text-primary">
                          <CheckIcon />
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            )}

            {/* Add Child */}
            {!user && !isLoading && <div className="border-t border-border">
              <button
                onClick={() => { setOpen(false); setAddingChild(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-text-muted hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <span className="w-6 h-6 rounded-full border-2 border-dashed border-current flex items-center justify-center flex-shrink-0">
                  <PlusIcon />
                </span>
                <span className="flex-1 text-left">เพิ่มเด็ก</span>
              </button>
            </div>}
          </div>
        )}
      </div>

      <AddChildModal open={!user && !isLoading && addingChild} onClose={() => { setAddingChild(false); triggerRef.current?.focus(); }} />
    </>
  );
}
