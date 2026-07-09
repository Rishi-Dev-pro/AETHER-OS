class InteractionRegistry {
  private elements = new Map<string, HTMLElement>();
  private metadata = new Map<string, any>();
  private viewportElement: HTMLElement | null = null;

  /**
   * Registers an interactive DOM element.
   */
  registerElement(id: string, element: HTMLElement, metadata?: any) {
    this.elements.set(id, element);
    if (metadata !== undefined) {
      this.metadata.set(id, metadata);
    }
  }

  /**
   * Unregisters an interactive DOM element.
   */
  unregisterElement(id: string) {
    this.elements.delete(id);
    this.metadata.delete(id);
  }

  /**
   * Sets the active camera viewport DOM element.
   */
  registerViewport(element: HTMLElement) {
    this.viewportElement = element;
  }

  /**
   * Removes the camera viewport DOM element.
   */
  unregisterViewport() {
    this.viewportElement = null;
  }

  /**
   * Retrieves the bounding box of the active viewport relative to the window.
   */
  getViewportRect(): DOMRect | null {
    if (!this.viewportElement) return null;
    return this.viewportElement.getBoundingClientRect();
  }

  /**
   * Gets all registered elements.
   */
  getElements(): Map<string, HTMLElement> {
    return this.elements;
  }

  /**
   * Gets metadata for a specific element.
   */
  getMetadata(id: string): any {
    return this.metadata.get(id);
  }
}

export const interactionRegistry = new InteractionRegistry();
