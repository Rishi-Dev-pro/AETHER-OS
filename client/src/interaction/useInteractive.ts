import { useEffect, useRef } from "react";
import { interactionRegistry } from "./interactionRegistry";
import { useInteractionStore } from "../store/interactionStore";

/**
 * Custom React hook to bind any DOM element to the Interaction Engine.
 * Auto-registers bounds on mount, handles cleanup on unmount, and returns
 * boolean flags for real-time hover and press states.
 *
 * @param id Unique identifier for the element.
 * @param metadata Optional metadata to attach to the element in the registry.
 */
export function useInteractive<T extends HTMLElement = HTMLElement>(
  id: string,
  metadata?: any
) {
  const ref = useRef<T>(null);

  // Subscribe dynamically to state store slices to avoid unnecessary parent re-renders
  const isHovered = useInteractionStore((state) => state.hoveredId === id);
  const isPressed = useInteractionStore((state) => state.pressedId === id);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    interactionRegistry.registerElement(id, element, metadata);

    return () => {
      interactionRegistry.unregisterElement(id);
    };
  }, [id, metadata]);

  return { ref, isHovered, isPressed };
}
