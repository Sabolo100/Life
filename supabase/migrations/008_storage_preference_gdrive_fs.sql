-- 008: storage_preference enum bővítése + drive_folder_id oszlop
-- A régi 'local' (localStorage) kivezetésre kerül, helyette 'gdrive' (Google Drive)
-- és 'fs_local' (File System Access API) az új lokális tárolási opciók.

-- 1) Drop the old check constraint (ha létezik)
alter table profiles drop constraint if exists profiles_storage_preference_check;

-- 2) Bármi régi 'local' érték konvertálása 'cloud'-ra (fejlesztési időszakból maradt értékek);
--    production-ban ne legyen ilyen, de biztonsági hálóként hasznos.
update profiles set storage_preference = 'cloud' where storage_preference = 'local';

-- 3) Új check constraint: csak 'cloud', 'gdrive', 'fs_local' érvényes
alter table profiles
  add constraint profiles_storage_preference_check
  check (storage_preference in ('cloud', 'gdrive', 'fs_local'));

-- 4) drive_folder_id oszlop — csak 'gdrive' módban van értéke,
--    a user kiválasztott Drive-mappájának ID-ját tárolja.
alter table profiles
  add column if not exists drive_folder_id text;
