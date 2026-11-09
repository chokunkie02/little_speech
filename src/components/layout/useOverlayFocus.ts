import { useEffect, useEffectEvent, type RefObject } from "react";

export function useOverlayFocus(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const root = ref.current;
    if (!open || !root) return;
    const trigger = document.activeElement;
    const getControls = () => Array.from(root.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]',
    )).filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length);
    (root.querySelector<HTMLElement>("[data-overlay-focus]") ?? getControls()[0])?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const active = document.activeElement;
      const activeOverlay = active?.closest('[role="dialog"][aria-modal="true"]');
      if (activeOverlay && activeOverlay !== root) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "Tab") {
        const controls = getControls();
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (first && (!root!.contains(active) || (event.shiftKey ? active === first : active === last))) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, [open, ref]);
}
