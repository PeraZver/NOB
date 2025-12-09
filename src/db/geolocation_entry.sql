use nob;
UPDATE brigades
SET location = ST_GeomFromText('POINT( 15.659197829093895 44.64437576488723)', 4326),
    formation_site = 'Laudonov Gaj, near Krbavsko Polje'
WHERE id = 16;