use nob;
UPDATE divisions
SET location = ST_GeomFromText('POINT(13.773155642157821 46.17098484829277)', 4326),
    formation_site = 'Posočje'
WHERE id = 28;