use nob;
UPDATE divisions
SET location = ST_GeomFromText('POINT(17.464641861424713 45.55697732226723)', 4326),
    formation_site = 'Zvečevo'
WHERE id = 12;