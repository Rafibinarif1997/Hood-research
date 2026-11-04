-- Secure COD checkout: validates prices and stock on the server, then creates the order atomically.
create or replace function public.place_cod_order(
  p_order_code text,
  p_customer_name text,
  p_phone text,
  p_district text,
  p_upazila text,
  p_address text,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_total numeric(12,2) := 0;
begin
  if coalesce(trim(p_customer_name),'') = '' or coalesce(trim(p_phone),'') = ''
     or coalesce(trim(p_district),'') = '' or coalesce(trim(p_upazila),'') = ''
     or coalesce(trim(p_address),'') = '' then
    raise exception 'সব ডেলিভারি তথ্য পূরণ করুন';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'কার্ট খালি';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 then raise exception 'পরিমাণ সঠিক নয়'; end if;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and active = true
      for update;
    if not found then raise exception 'একটি পণ্য আর পাওয়া যাচ্ছে না'; end if;
    if v_product.stock < v_qty then raise exception 'স্টকে পর্যাপ্ত পণ্য নেই: %', v_product.name; end if;
    v_total := v_total + v_product.price * v_qty;
  end loop;

  insert into public.orders(order_code,customer_name,phone,district,upazila,address,total,payment_method,status)
  values(p_order_code,trim(p_customer_name),trim(p_phone),trim(p_district),trim(p_upazila),trim(p_address),v_total,'COD','নতুন অর্ডার')
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::integer;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and active = true
      for update;
    insert into public.order_items(order_id,product_id,product_name,unit_price,quantity,selected_size,selected_color)
    values(v_order_id,v_product.id,v_product.name,v_product.price,v_qty,
      coalesce(v_item->>'selected_size',''),coalesce(v_item->>'selected_color',''));
    update public.products set stock = stock - v_qty, updated_at = now() where id = v_product.id;
  end loop;

  return jsonb_build_object('order_code',p_order_code,'total',v_total);
end;
$$;

revoke all on function public.place_cod_order(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.place_cod_order(text,text,text,text,text,text,jsonb) to anon, authenticated;
