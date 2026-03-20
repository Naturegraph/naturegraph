import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-[var(--color-border-light)] bg-[var(--color-bg-secondary)]">
      <div className="container mx-auto px-4 lg:px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--color-text-tertiary)]">
            &copy; {new Date().getFullYear()} {t("common.appName")}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Donnees taxonomiques : TAXREF v18.0 — PatriNat (OFB-CNRS-MNHN-IRD)
          </p>
        </div>
      </div>
    </footer>
  );
}
