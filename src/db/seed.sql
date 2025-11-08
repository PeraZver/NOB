USE nob;

INSERT INTO brigades (name, formation_date, description, location, wikipedia_url)
VALUES
('1st Brigade', '1943-01-01', 'Description of the 1st Brigade', ST_GeomFromText('POINT(20 44)'), 'https://en.wikipedia.org/wiki/1st_Brigade'),
('2nd Brigade', '1943-02-15', 'Description of the 2nd Brigade', ST_GeomFromText('POINT(21 45)'), 'https://en.wikipedia.org/wiki/2nd_Brigade');