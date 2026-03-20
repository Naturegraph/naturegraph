import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <main className="container" style={{ textAlign: "center", paddingTop: "4rem" }}>
      <h1>404</h1>
      <p>Page introuvable</p>
      <Link to="/">{t("common.back")}</Link>
    </main>
  );
}
