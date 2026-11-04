-- Mohammad Baby Shop: recommended full baby-shop category set
-- Safe to run more than once. Existing categories and product assignments are preserved.
insert into public.categories (name, emoji)
values
  ('বেবি পোশাক', '👕'),
  ('নবজাতকের প্রয়োজনীয় পণ্য', '👶'),
  ('ডায়াপার ও ওয়াইপস', '🧷'),
  ('ফিডিং ও breastfeeding', '🍼'),
  ('বেবি ফুড ও সলিড ফুড', '🥣'),
  ('বেবি বাথ ও স্কিনকেয়ার', '🛁'),
  ('স্বাস্থ্য ও নিরাপত্তা', '🩺'),
  ('বেবি খেলনা', '🧸'),
  ('শিক্ষামূলক খেলনা ও বই', '📚'),
  ('বেবি বেডিং ও কমফোর্ট', '🛏️'),
  ('স্ট্রলার ও ট্রাভেল', '🚼'),
  ('বেবি ফার্নিচার ও নার্সারি', '🪑'),
  ('বেবি জুতা ও মোজা', '🧦'),
  ('বেবি এক্সেসরিজ', '🎀'),
  ('মা ও মাতৃত্বকালীন পণ্য', '🤱'),
  ('গিফট সেট ও কম্বো', '🎁'),
  ('বেবি তোয়ালে ও গোসলের সামগ্রী', '🧼'),
  ('বেবি কেয়ার ও ক্লিনিং', '🧺')
on conflict (name) do nothing;
