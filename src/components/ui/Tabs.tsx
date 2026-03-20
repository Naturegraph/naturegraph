import { useState, type ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

interface TabPanelProps {
  id: string;
  activeTab: string;
  children: ReactNode;
  className?: string;
}

function Tabs({ tabs, defaultTab, activeTab: controlledTab, onChange, className = "" }: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultTab || tabs[0]?.id || "");
  const activeTab = controlledTab ?? internalTab;

  const handleChange = (tabId: string) => {
    if (!controlledTab) setInternalTab(tabId);
    onChange?.(tabId);
  };

  return (
    <div
      role="tablist"
      className={`flex gap-1 border-b border-[var(--color-border-light)] ${className}`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          onClick={() => handleChange(tab.id)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === tab.id
              ? "border-[var(--color-action-default)] text-[var(--color-action-default)]"
              : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]"
          }`}
        >
          {tab.icon && <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4" aria-hidden="true">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function TabPanel({ id, activeTab, children, className = "" }: TabPanelProps) {
  if (activeTab !== id) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={className}
    >
      {children}
    </div>
  );
}

export { Tabs, TabPanel };
export type { TabsProps, TabPanelProps, Tab };
