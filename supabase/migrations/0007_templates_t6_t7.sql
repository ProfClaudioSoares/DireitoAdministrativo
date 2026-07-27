-- Amplia o conjunto de templates: libera T6 (destaque âmbar) e T7 (numeral claro),
-- mantendo T1–T5. Recria o check de slides.template.
alter table slides drop constraint if exists slides_template_check;
alter table slides
  add constraint slides_template_check
  check (template in ('T1','T2','T3','T4','T5','T6','T7'));
