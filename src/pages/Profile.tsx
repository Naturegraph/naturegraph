import { useTranslation } from "react-i18next";

export default function Profile() {
  const { t } = useTranslation();

  return (
    <main className="container">
      <h1>{t("nav.profile")}</h1>
    </main>
  );
}
