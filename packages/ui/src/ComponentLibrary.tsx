"use client";

import { useMemo, useState, type DragEvent, type ReactNode } from "react";
import { CATEGORIES, COMPONENTS, type CategoryDef, type ComponentDef } from "@porygon/icons";
import { PORYGON_DRAG_MIME_TYPE } from "@porygon/canvas";

function matches(component: ComponentDef, query: string): boolean {
  if (query === "") {
    return true;
  }
  return component.label.toLowerCase().includes(query);
}

export function ComponentLibrary(): ReactNode {
  const [query, setQuery] = useState<string>("");

  const visibleByCategory: Map<string, ComponentDef[]> = useMemo(() => {
    const normalizedQuery: string = query.trim().toLowerCase();
    const map = new Map<string, ComponentDef[]>();
    for (const category of CATEGORIES) {
      const items: ComponentDef[] = COMPONENTS.filter(
        (component: ComponentDef): boolean =>
          component.categoryId === category.id && matches(component, normalizedQuery),
      );
      if (items.length > 0) {
        map.set(category.id, items);
      }
    }
    return map;
  }, [query]);

  return (
    <div className="sidebar">
      <div className="sidebar-search-wrap">
        <input
          className="search-box"
          type="text"
          placeholder={`Search ${COMPONENTS.length}+ components…`}
          value={query}
          onChange={(event): void => setQuery(event.target.value)}
          data-testid="component-search"
        />
      </div>
      <div className="sidebar-scroll">
        {CATEGORIES.map((category: CategoryDef): ReactNode => {
          const items: ComponentDef[] | undefined = visibleByCategory.get(category.id);
          if (!items) {
            return null;
          }
          return (
            <div className="category" key={category.id}>
              <div className="category-label">
                {category.label} <span className="category-count">{items.length}</span>
              </div>
              <div className="icon-grid">
                {items.map(
                  (component: ComponentDef): ReactNode => (
                    <div
                      key={component.id}
                      className="icon-chip"
                      draggable
                      data-testid={`component-chip-${component.id}`}
                      onDragStart={(event: DragEvent<HTMLDivElement>): void => {
                        event.dataTransfer.setData(PORYGON_DRAG_MIME_TYPE, component.id);
                        event.dataTransfer.setData("text/plain", component.label);
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                    >
                      <div className="icon-glyph" style={{ background: component.color }}>
                        {component.glyph}
                      </div>
                      <div className="icon-label">{component.label}</div>
                    </div>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
