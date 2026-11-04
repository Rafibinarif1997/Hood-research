/* Mohammad Baby Shop — Supabase-powered storefront */
const MBS_SUPABASE_URL = 'https://ojpiysphfcuxjfmfsdig.supabase.co';
const MBS_SUPABASE_KEY = 'sb_publishable_E1gBvsjcniexpyP_CwsW2g_Qe4JYLSc';
const MBS_ADMIN_EMAIL = 'rafibinarif1997@gmail.com';
const MBS_BUCKET = 'product-images';
const mbsDb = window.supabase.createClient(MBS_SUPABASE_URL, MBS_SUPABASE_KEY);
let mbsSession = null;
let mbsCategoryRows = [];
let mbsCategoryImages = {};
let mbsRemoteReady = false;
const mbsEsc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mbsSizes = v => Array.isArray(v) ? v.join(', ') : (v || '');
const mbsToProduct = p => ({id:p.id,name:p.name,cat:mbsCategoryRows.find(c=>c.id===p.category_id)?.name || 'অন্যান্য',category_id:p.category_id,price:Number(p.price),old:Number(p.old_price||0),stock:p.stock,sizes:mbsSizes(p.sizes),colors:mbsSizes(p.colors),desc:p.description||'',emoji:p.emoji||'🧸',image1:p.image1||'',image2:p.image2||'',image3:p.image3||''});
async function mbsLoadPublic(){
  const [cr,pr] = await Promise.all([
    mbsDb.from('categories').select('*').order('name'),
    mbsDb.from('products').select('*').eq('active',true).order('created_at',{ascending:false})
  ]);
  if(cr.error) throw cr.error; if(pr.error) throw pr.error;
  mbsCategoryRows=cr.data||[];
  // First-time setup: create starter categories if the database has none.
  if(mbsCategoryRows.length===0){
    const starter=[{name:'বেবি পোশাক',emoji:'👶'},{name:'খেলনা',emoji:'🧸'},{name:'ফিডিং',emoji:'🍼'},{name:'বেবি কেয়ার',emoji:'🧴'},{name:'বেবি বেডিং',emoji:'🛏️'},{name:'নার্সারি',emoji:'🧺'}];
    const seeded=await mbsDb.from('categories').insert(starter);
    if(seeded.error) throw seeded.error;
    const refreshed=await mbsDb.from('categories').select('*').order('name');
    if(refreshed.error) throw refreshed.error;
    mbsCategoryRows=refreshed.data||[];
  }
  categories=mbsCategoryRows.map(x=>x.name); mbsCategoryImages=Object.fromEntries(mbsCategoryRows.map(x=>[x.name,x.image_url||'']));
  products=(pr.data||[]).map(mbsToProduct);
  mbsRemoteReady=true;
  render();
}
async function mbsRefreshAdmin(){
  const [cr,pr,or,ir]=await Promise.all([
    mbsDb.from('categories').select('*').order('name'),
    mbsDb.from('products').select('*').order('created_at',{ascending:false}),
    mbsDb.from('orders').select('*').order('created_at',{ascending:false}),
    mbsDb.from('order_items').select('*')
  ]);
  for(const r of [cr,pr,or,ir]) if(r.error) throw r.error;
  mbsCategoryRows=cr.data||[]; categories=mbsCategoryRows.map(x=>x.name); mbsCategoryImages=Object.fromEntries(mbsCategoryRows.map(x=>[x.name,x.image_url||'']));
  products=(pr.data||[]).map(mbsToProduct);
  orders=(or.data||[]).map(o=>({...o,code:o.order_code,name:o.customer_name,phone:o.phone,total:Number(o.total),date:new Date(o.created_at).toLocaleString('bn-BD'),items:(ir.data||[]).filter(i=>i.order_id===o.id)}));
  render();
}
async function mbsUpload(file){
  if(!file) return null;
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
  const path=Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext;
  const {error}=await mbsDb.storage.from(MBS_BUCKET).upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
  if(error) throw error;
  return mbsDb.storage.from(MBS_BUCKET).getPublicUrl(path).data.publicUrl;
}
async function mbsLogin(email,password){
  if(email.toLowerCase()!==MBS_ADMIN_EMAIL){toast('এই ইমেইল Admin হিসেবে অনুমোদিত নয়');return}
  const {data,error}=await mbsDb.auth.signInWithPassword({email,password});
  if(error) throw error;
  mbsSession=data.session;
  await mbsRefreshAdmin();
}
async function mbsLogout(){await mbsDb.auth.signOut();mbsSession=null;location.hash='home';render()}
function render(){
  const [page]=((location.hash.slice(1)||'home').split('/'));
  if(page==='admin'&&!mbsSession){
    $('#app').innerHTML='<div class="wrap"><div class="panel" style="max-width:520px;margin:30px auto"><h1 class="title">Admin Login</h1><p class="muted">শুধু অনুমোদিত Admin প্রবেশ করতে পারবেন।</p><form id="mbsLoginForm"><label>Admin Gmail</label><input class="field" name="email" type="email" value="'+MBS_ADMIN_EMAIL+'" required><label>Password</label><input class="field" name="password" type="password" required><button class="btn primary" style="width:100%">Login</button></form><p id="mbsLoginError" class="notice" hidden></p></div></div>';
    $('#mbsLoginForm').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;b.textContent='লগইন হচ্ছে...';try{const f=Object.fromEntries(new FormData(e.target));await mbsLogin(f.email,f.password)}catch(err){const n=$('#mbsLoginError');n.hidden=false;n.textContent='লগইন হয়নি: '+err.message}finally{b.disabled=false;b.textContent='Login'}};
    return;
  }
  if(page==='admin'&&mbsSession){
    $('#app').innerHTML='<div class="wrap"><div class="row"><h1 class="title">Admin Dashboard</h1><button class="pill" onclick="mbsLogout()">Logout</button></div><p class="muted">Logged in: '+MBS_ADMIN_EMAIL+'</p><div class="notice">ডেটাবেস ও ছবি Supabase-এ সংরক্ষিত হচ্ছে।</div><button class="pill" onclick="adminTab(\'products\')">পণ্য</button> <button class="pill" onclick="adminTab(\'categories\')">ক্যাটাগরি</button> <button class="pill" onclick="adminTab(\'orders\')">অর্ডার ('+orders.length+')</button><div id="adminarea"></div></div>';
    adminTab('products');return;
  }
  const oldHash=location.hash;
  window.__mbsOldRender();
  if(page==='checkout' && $('#order')) $('#order').onsubmit=mbsPlaceOrder;
  if(page==='track' && $('#track')) $('#track').onsubmit=mbsTrackOrder;
}
window.__mbsOldRender=renderLegacy;
async function mbsPlaceOrder(e){
  e.preventDefault();
  if(!cart.length)return;
  const f=Object.fromEntries(new FormData(e.target));
  const code='MBS'+Date.now().toString().slice(-8);
  const payload={p_order_code:code,p_customer_name:f.name,p_phone:f.phone,p_district:f.district,p_upazila:f.upazila,p_address:f.address,p_items:cart.map(x=>({product_id:x.id,quantity:x.qty,selected_size:x.size||'',selected_color:x.color||''}))};
  const b=e.target.querySelector('button');b.disabled=true;b.textContent='অর্ডার পাঠানো হচ্ছে...';
  const {data,error}=await mbsDb.rpc('place_cod_order',payload);
  b.disabled=false;b.textContent='অর্ডার কনফার্ম করুন — '+money(cart.reduce((s,x)=>s+x.price*x.qty,0));
  if(error){toast('অর্ডার হয়নি: '+error.message);return}
  cart=[];save('mbs_cart',cart);location.hash='success/'+code;
}
async function mbsTrackOrder(e){
  e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
  const {data,error}=await mbsDb.rpc('track_order',{p_order_code:f.code,p_phone:f.phone});
  $('#result').innerHTML=error?'<div class="notice">সমস্যা হয়েছে: '+mbsEsc(error.message)+'</div>':data?.length?'<div class="notice">স্ট্যাটাস: <b>'+mbsEsc(data[0].status)+'</b><br>তারিখ: '+new Date(data[0].created_at).toLocaleString('bn-BD')+'<br>মোট: '+money(data[0].total)+'</div>':'<div class="notice">অর্ডার পাওয়া যায়নি। তথ্য যাচাই করুন।</div>';
}
function adminTab(t){
  const a=$('#adminarea');if(!a)return;
  if(t==='categories'){
    a.innerHTML='<div class="panel" style="margin-top:18px"><h2>নতুন ক্যাটাগরি যোগ করুন</h2><form id="mbsCatForm"><label>ক্যাটাগরির নাম *</label><input class="field" name="name" required placeholder="যেমন: বেবি পোশাক"><label>ক্যাটাগরির ছবি *</label><input class="field" type="file" name="image" accept="image/*" required><input class="field" name="emoji" placeholder="বিকল্প ইমোজি (যেমন 🧸)"><button class="btn primary">ক্যাটাগরি যোগ করুন</button></form><h2 style="margin-top:24px">ক্যাটাগরি তালিকা</h2>'+mbsCategoryRows.map(c=>'<div class="row"><span>'+(c.image_url?'<img src="'+mbsEsc(c.image_url)+'" alt="" style="width:54px;height:54px;object-fit:cover;border-radius:10px;vertical-align:middle;margin-right:10px">':mbsEsc(c.emoji||'🧸')+' ')+'<b>'+mbsEsc(c.name)+'</b></span><span><button type="button" data-edit-cat="'+c.id+'">নাম/ছবি এডিট</button> <button type="button" data-delete-cat="'+c.id+'">মুছুন</button></span></div>').join('')+'</div>';
    $('#mbsCatForm').onsubmit=async e=>{e.preventDefault();const form=e.target,f=Object.fromEntries(new FormData(form)),b=form.querySelector('button');b.disabled=true;try{const image_url=await mbsUpload(form.elements.image.files[0]);const {error}=await mbsDb.from('categories').insert({name:f.name.trim(),emoji:f.emoji||'🧸',image_url});if(error)throw error;await mbsRefreshAdmin();adminTab('categories');toast('ক্যাটাগরি যোগ হয়েছে')}catch(err){toast('ক্যাটাগরি যোগ হয়নি: '+err.message)}finally{b.disabled=false}};
    a.querySelectorAll('[data-edit-cat]').forEach(b=>b.onclick=()=>mbsEditCategory(b.dataset.editCat));
    a.querySelectorAll('[data-delete-cat]').forEach(b=>b.onclick=()=>mbsDeleteCat(b.dataset.deleteCat));
  } else if(t==='products'){
    a.innerHTML='<div class="panel" style="margin-top:18px"><h2>নতুন পণ্য যোগ করুন</h2><form id="mbsProductForm"><div class="formgrid"><label>পণ্যের নাম *<input class="field" name="name" required></label><label>ক্যাটাগরি *<select class="field" name="category_id" required>'+mbsCategoryRows.map(c=>'<option value="'+c.id+'">'+mbsEsc(c.name)+'</option>').join('')+'</select></label><label>বিক্রয় মূল্য (৳) *<input class="field" type="number" min="0" name="price" required></label><label>আগের মূল্য<input class="field" type="number" min="0" name="old_price"></label><label>স্টক<input class="field" type="number" min="0" name="stock" required></label><label>সাইজ (কমা দিয়ে)<input class="field" name="sizes"></label><label>কালার (কমা দিয়ে)<input class="field" name="colors"></label><label>ইমোজি<input class="field" name="emoji" value="🧸"></label></div><label>বিবরণ<textarea class="field" name="description" rows="3"></textarea></label><div class="admin-images"><label>ছবি ১<input class="field" type="file" name="image1" accept="image/*"></label><label>ছবি ২<input class="field" type="file" name="image2" accept="image/*"></label><label>ছবি ৩<input class="field" type="file" name="image3" accept="image/*"></label></div><button class="btn primary">পণ্য যোগ করুন</button></form></div><div class="panel" style="margin-top:15px"><h2>পণ্য তালিকা</h2>'+products.map(p=>'<div class="row"><span><b>'+mbsEsc(p.name)+'</b><br>'+money(p.price)+' • স্টক '+p.stock+' • '+mbsEsc(p.cat)+'</span><span><button onclick="mbsEditProduct(\''+p.id+'\')">এডিট</button> <button onclick="mbsDeleteProduct(\''+p.id+'\')">মুছুন</button></span></div>').join('')+'</div>';
    $('#mbsProductForm').onsubmit=async e=>{e.preventDefault();const form=e.target,f=Object.fromEntries(new FormData(form));const b=form.querySelector('button');b.disabled=true;try{const files=['image1','image2','image3'].map(k=>form.elements[k].files[0]);const urls=await Promise.all(files.map(mbsUpload));const row={name:f.name.trim(),category_id:f.category_id,price:Number(f.price),old_price:Number(f.old_price)||0,stock:Number(f.stock),sizes:f.sizes.split(',').map(x=>x.trim()).filter(Boolean),colors:f.colors.split(',').map(x=>x.trim()).filter(Boolean),emoji:f.emoji||'🧸',description:f.description||'',image1:urls[0],image2:urls[1],image3:urls[2]};const {error}=await mbsDb.from('products').insert(row);if(error)throw error;await mbsRefreshAdmin();adminTab('products');toast('পণ্য যোগ হয়েছে')}catch(err){toast('সংরক্ষণ হয়নি: '+err.message)}finally{b.disabled=false}};
  } else {
    const orderCards = orders.length ? orders.map(o => {
      const itemRows = (o.items || []).map(item => '<div class="row"><span><b>'+mbsEsc(item.product_name)+'</b><br><small>সাইজ: '+mbsEsc(item.selected_size || 'নির্বাচিত নয়')+' | কালার: '+mbsEsc(item.selected_color || 'নির্বাচিত নয়')+'</small></span><span>পরিমাণ: <b>'+Number(item.quantity||0)+' পিস</b><br>'+money(item.unit_price)+' × '+Number(item.quantity||0)+'</span></div>').join('');
      const statusOptions = ['নতুন অর্ডার','কনফার্ম','প্রসেসিং','শিপড','ডেলিভারি সম্পন্ন','বাতিল'].map(s => '<option '+(s===o.status?'selected':'')+'>'+s+'</option>').join('');
      return `<section class="panel" style="margin-top:14px"><div class="row"><span><b>অর্ডার: ${mbsEsc(o.code)}</b><br>${mbsEsc(o.date||'')}</span><select onchange="mbsSetOrderStatus('${o.id}',this.value)">${statusOptions}</select></div><h3>কাস্টমারের তথ্য</h3><p><b>নাম:</b> ${mbsEsc(o.name)}<br><b>মোবাইল:</b> ${mbsEsc(o.phone)}<br><b>ঠিকানা:</b> ${mbsEsc(o.district)}, ${mbsEsc(o.upazila)}, ${mbsEsc(o.address)}</p><h3>অর্ডারকৃত পণ্য (${(o.items||[]).length}টি)</h3>${itemRows||'<p class="muted">এই অর্ডারের পণ্যের বিস্তারিত পাওয়া যায়নি।</p>'}<div class="row"><b>সর্বমোট</b><b class="price">${money(o.total)}</b></div></section>`;
    }).join('') : '<div class="panel" style="margin-top:18px">কোনো অর্ডার নেই</div>';
    a.innerHTML='<div style="margin-top:18px"><h2>অর্ডার ম্যানেজমেন্ট ('+orders.length+')</h2>'+orderCards+'</div>';
  }
}
async function mbsEditCategory(id){const cat=mbsCategoryRows.find(x=>x.id===id);if(!cat)return;const name=prompt('ক্যাটাগরির নাম',cat.name);if(name===null||!name.trim())return;const picker=document.createElement('input');picker.type='file';picker.accept='image/*';picker.onchange=async()=>{try{const patch={name:name.trim()};if(picker.files[0])patch.image_url=await mbsUpload(picker.files[0]);const {error}=await mbsDb.from('categories').update(patch).eq('id',id);if(error)throw error;await mbsRefreshAdmin();adminTab('categories');toast('ক্যাটাগরি আপডেট হয়েছে')}catch(err){toast('আপডেট হয়নি: '+err.message)}};picker.click()}
async function mbsRenameCat(id){const c=mbsCategoryRows.find(x=>x.id===id);const name=prompt('ক্যাটাগরির নতুন নাম',c?.name);if(!name?.trim())return;const {error}=await mbsDb.from('categories').update({name:name.trim()}).eq('id',id);if(error){toast(error.message);return}await mbsRefreshAdmin();adminTab('categories')}
async function mbsDeleteCat(id){
  const cat=mbsCategoryRows.find(x=>x.id===id);if(!cat)return;
  const {data:linked,error:readError}=await mbsDb.from('products').select('id').eq('category_id',id);
  if(readError){toast('পণ্যের তালিকা দেখা যায়নি: '+readError.message);return}
  let targetId=null;
  if(linked&&linked.length){
    const alternatives=mbsCategoryRows.filter(x=>x.id!==id);
    if(!alternatives.length){toast('এটাই শেষ ক্যাটাগরি। আগে আরেকটি ক্যাটাগরি যোগ করুন।');return}
    const choices=alternatives.map((x,i)=>(i+1)+'. '+x.name).join('\\n');
    const answer=prompt('এই ক্যাটাগরিতে '+linked.length+'টি পণ্য আছে। মুছে ফেলার আগে পণ্যগুলো কোন ক্যাটাগরিতে সরাবেন?\\n\\n'+choices+'\\n\\nনম্বর লিখুন:');
    if(answer===null)return;
    const n=Number(answer);
    if(!Number.isInteger(n)||n<1||n>alternatives.length){toast('সঠিক ক্যাটাগরি নম্বর দিন');return}
    targetId=alternatives[n-1].id;
    if(!confirm(linked.length+'টি পণ্য "'+alternatives[n-1].name+'" ক্যাটাগরিতে সরিয়ে "'+cat.name+'" মুছে ফেলবেন?'))return;
    const {error:moveError}=await mbsDb.from('products').update({category_id:targetId}).eq('category_id',id);
    if(moveError){toast('পণ্য সরানো যায়নি: '+moveError.message);return}
  }else if(!confirm('"'+cat.name+'" ক্যাটাগরিটি মুছে ফেলবেন?'))return;
  const {error}=await mbsDb.from('categories').delete().eq('id',id);
  if(error){toast('ক্যাটাগরি মুছতে পারেনি: '+error.message);return}
  await mbsRefreshAdmin();adminTab('categories');toast('ক্যাটাগরি মুছে ফেলা হয়েছে');
}
async function mbsDeleteProduct(id){if(!confirm('পণ্যটি মুছবেন?'))return;const {error}=await mbsDb.from('products').delete().eq('id',id);if(error){toast(error.message);return}await mbsRefreshAdmin();adminTab('products')}
async function mbsEditProduct(id){
  const p=products.find(x=>x.id===id);if(!p)return;adminTab('products');
  const a=$('#adminarea');a.scrollIntoView({behavior:'smooth'});
  const form=$('#mbsProductForm');form.elements.name.value=p.name;form.elements.category_id.value=p.category_id;form.elements.price.value=p.price;form.elements.old_price.value=p.old;form.elements.stock.value=p.stock;form.elements.sizes.value=p.sizes;form.elements.colors.value=p.colors;form.elements.emoji.value=p.emoji;form.elements.description.value=p.desc;
  form.querySelector('button').textContent='পরিবর্তন সংরক্ষণ করুন';
  form.onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(form));const b=form.querySelector('button');b.disabled=true;try{const files=['image1','image2','image3'].map(k=>form.elements[k].files[0]);const urls=await Promise.all(files.map(mbsUpload));const row={name:f.name.trim(),category_id:f.category_id,price:Number(f.price),old_price:Number(f.old_price)||0,stock:Number(f.stock),sizes:f.sizes.split(',').map(x=>x.trim()).filter(Boolean),colors:f.colors.split(',').map(x=>x.trim()).filter(Boolean),emoji:f.emoji||'🧸',description:f.description||''};['image1','image2','image3'].forEach((k,i)=>{if(urls[i])row[k]=urls[i]});const {error}=await mbsDb.from('products').update(row).eq('id',id);if(error)throw error;await mbsRefreshAdmin();adminTab('products');toast('পণ্য আপডেট হয়েছে')}catch(err){toast('আপডেট হয়নি: '+err.message)}finally{b.disabled=false}};
}
async function mbsSetOrderStatus(id,status){const {error}=await mbsDb.from('orders').update({status}).eq('id',id);if(error){toast(error.message);return}await mbsRefreshAdmin();adminTab('orders')}
mbsDb.auth.getSession().then(async ({data})=>{mbsSession=data.session;if(mbsSession?.user?.email?.toLowerCase()!==MBS_ADMIN_EMAIL){await mbsDb.auth.signOut();mbsSession=null}try{await mbsLoadPublic()}catch(err){console.error(err);toast('Supabase ডেটা লোড হয়নি: '+err.message);render()}if(location.hash==='#admin'&&mbsSession)await mbsRefreshAdmin()});
mbsDb.auth.onAuthStateChange((_event,session)=>{mbsSession=session;if(location.hash==='#admin')render()});
// Re-render the correct page whenever a customer clicks an in-site hash link.
// Without this listener, the URL changes but the visible page stays unchanged until refresh.
window.addEventListener('hashchange',()=>{render();});
