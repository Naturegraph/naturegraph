-- Floutage server-side des coordonnees quand location_hidden = true
-- Snap a une grille de 0.1 degre (~10 km) cote serveur.
-- Garantit qu'un client ne peut pas leaker la position exacte d'une espece sensible.

CREATE OR REPLACE FUNCTION blur_hidden_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_hidden = true AND NEW.location_point IS NOT NULL THEN
    NEW.location_point := ST_SnapToGrid(NEW.location_point::geometry, 0.1)::geography;
    NEW.latitude  := ROUND(NEW.latitude::numeric, 1);
    NEW.longitude := ROUND(NEW.longitude::numeric, 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_blur_hidden_location ON posts;
CREATE TRIGGER trg_blur_hidden_location
  BEFORE INSERT OR UPDATE OF location_point, location_hidden, latitude, longitude ON posts
  FOR EACH ROW EXECUTE FUNCTION blur_hidden_location();
