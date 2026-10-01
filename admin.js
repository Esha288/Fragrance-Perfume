(function(){
  'use strict';
  const PRODUCTS_KEY='elegance-admin-products';
  const ORDERS_KEY='elegance-orders';
  const SETTINGS_KEY='elegance-admin-settings';
  const SESSION_KEY='elegance-admin-session';
  const DEFAULT_SETTINGS={storeName:'ÉLÉGANCE',currency:'USD',adminEmail:'admin@example.com'};
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money=v=>{const n=parseFloat(String(v??'').replace(/[^0-9.-]/g,''))||0;return '$'+n.toFixed(2).replace(/\.00$/,'');};
  const read=(k,d)=>{try{const x=JSON.parse(localStorage.getItem(k));return x??d}catch(e){return d}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const baseProducts=()=>((window.ELEGANCE_PRODUCTS&&window.ELEGANCE_PRODUCTS.products)||[]).map(p=>({...p}));
  function products(){let p=read(PRODUCTS_KEY,null); if(!Array.isArray(p)){p=baseProducts().map(x=>({...x,stock:x.stock??20,status:x.status||'active'}));write(PRODUCTS_KEY,p)} else {let changed=false;p=p.map(x=>{if(x.stock===undefined){changed=true;return {...x,stock:20,status:x.status||'active'}};if(!x.status){changed=true;return {...x,status:'active'}};return x});if(changed)write(PRODUCTS_KEY,p)} return p;}
  function orders(){return read(ORDERS_KEY,[]);}
  async function apiRequest(url, options={}){
    const key=sessionStorage.getItem('elegance-admin-api-key')||'';
    const headers=Object.assign({},options.headers||{}, {'x-admin-key':key});
    let r=await fetch(url,Object.assign({},options,{headers}));
    if(r.status===401){
      const entered=prompt('Enter the Admin API Key configured on the server:');
      if(!entered) throw new Error('Admin API key required');
      sessionStorage.setItem('elegance-admin-api-key',entered);
      headers['x-admin-key']=entered;
      r=await fetch(url,Object.assign({},options,{headers}));
    }
    return r;
  }
  async function syncOrdersFromServer(){
    try{
      const r=await apiRequest('/api/orders',{cache:'no-store'});
      if(!r.ok) throw new Error('Order API unavailable');
      const data=await r.json();
      if(Array.isArray(data)){write(ORDERS_KEY,data);return true;}
    }catch(e){console.warn('Could not sync orders:',e.message);}
    return false;
  }
  function settings(){return {...DEFAULT_SETTINGS,...read(SETTINGS_KEY,{})};}
  function initCatalog(){const saved=read(PRODUCTS_KEY,null);if(Array.isArray(saved))window.ELEGANCE_PRODUCTS.products=saved;}
  initCatalog();

  const login=$('#adminLogin'), app=$('#adminApp');
  function isLogged(){return sessionStorage.getItem(SESSION_KEY)==='1'}
  async function showApp(){login.hidden=true;app.hidden=false;await syncOrdersFromServer();renderAll()}
  function showLogin(){login.hidden=false;app.hidden=true}
  $('#loginForm').addEventListener('submit',e=>{e.preventDefault();const u=$('#loginUser').value.trim(),p=$('#loginPass').value;if(u==='admin'&&p==='admin123'){sessionStorage.setItem(SESSION_KEY,'1');showApp()}else $('#loginError').textContent='Invalid admin credentials.'});
  $('#logoutBtn').addEventListener('click',()=>{sessionStorage.removeItem(SESSION_KEY);showLogin()});
  if(isLogged())showApp();else showLogin();

  const views={dashboard:$('#viewDashboard'),products:$('#viewProducts'),orders:$('#viewOrders'),customers:$('#viewCustomers'),settings:$('#viewSettings')};
  function nav(view){$$('.admin-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));Object.entries(views).forEach(([k,v])=>v.hidden=k!==view);$('#pageTitle').textContent={dashboard:'Dashboard',products:'Products',orders:'Orders',customers:'Customers',settings:'Settings'}[view]; if(view==='products')renderProducts();if(view==='orders')renderOrders();if(view==='customers')renderCustomers();}
  $$('.admin-nav button').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.view)));

  function renderDashboard(){
    const ps=products(), os=orders();
    const revenue=os.reduce((s,o)=>s+(Number(o.total)||0),0);
    $('#statProducts').textContent=ps.length; $('#statOrders').textContent=os.length; $('#statCustomers').textContent=new Set(os.map(o=>o.customer?.email).filter(Boolean)).size; $('#statRevenue').textContent=money(revenue);
    const recent=os.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);
    $('#recentOrders').innerHTML=recent.length?recent.map(o=>`<tr><td><strong>${esc(o.reference)}</strong></td><td>${esc((o.customer?.firstName||'')+' '+(o.customer?.lastName||''))}</td><td>${money(o.total)}</td><td><span class="status ${esc(o.status||'New').toLowerCase()}">${esc(o.status||'New')}</span></td><td>${new Date(o.createdAt).toLocaleDateString()}</td></tr>`).join(''):`<tr><td colspan="5" class="empty">No orders yet.</td></tr>`;
  }
  function normalizeProduct(p){
    return {...p, sku:p.sku||'', brand:p.brand||'ÉLÉGANCE', stock:Number.isFinite(Number(p.stock))?Number(p.stock):0, status:p.status||'active', size:p.size||'', description:p.description||'', tags:Array.isArray(p.tags)?p.tags:((p.tags||'').split(',').map(x=>x.trim()).filter(Boolean)), lowStock:!!p.lowStock};
  }
  function filteredProductEntries(){
    let entries=products().map((p,i)=>({p:normalizeProduct(p),i}));
    const q=($('#productSearch')?.value||'').trim().toLowerCase();
    const cat=$('#productCategoryFilter')?.value||'';
    const status=$('#productStatusFilter')?.value||'';
    if(q) entries=entries.filter(({p})=>[p.name,p.id,p.sku,p.brand].join(' ').toLowerCase().includes(q));
    if(cat) entries=entries.filter(({p})=>p.category===cat);
    if(status==='active') entries=entries.filter(({p})=>p.status!=='hidden'&&p.stock>0);
    if(status==='hidden') entries=entries.filter(({p})=>p.status==='hidden');
    if(status==='out') entries=entries.filter(({p})=>p.stock<=0);
    const sort=$('#productSort')?.value||'name';
    entries.sort((a,b)=>{
      if(sort==='price-low') return parseFloat(a.p.salePrice||a.p.price||0)-parseFloat(b.p.salePrice||b.p.price||0);
      if(sort==='price-high') return parseFloat(b.p.salePrice||b.p.price||0)-parseFloat(a.p.salePrice||a.p.price||0);
      if(sort==='stock-low') return a.p.stock-b.p.stock;
      if(sort==='stock-high') return b.p.stock-a.p.stock;
      return a.p.name.localeCompare(b.p.name);
    });
    return entries;
  }
  function renderProducts(){
    const ps=products(); $('#productCount').textContent=ps.length;
    const entries=filteredProductEntries();
    const selected=new Set(read('elegance-selected-products',[]));
    $('#productsTable').innerHTML=entries.map(({p,i})=>{
      const stockClass=p.stock<=0?'stock-out':(p.stock<=5||p.lowStock?'stock-low':'stock-ok');
      const status=p.status==='hidden'?'Hidden':'Active';
      return `<tr><td><input class="product-check" type="checkbox" data-i="${i}" ${selected.has(String(i))?'checked':''}></td><td><div class="product-cell"><img src="${esc(p.img||'')}" onerror="this.style.display='none'"><div><strong>${esc(p.name)}</strong><small>${esc(p.sku||p.id||'')}</small>${p.size?`<small>${esc(p.size)}</small>`:''}</div></div></td><td>${esc(p.category||'')}</td><td>${money(p.salePrice||p.price)}</td><td><span class="stock-pill ${stockClass}">${p.stock} ${p.stock===1?'unit':'units'}</span></td><td><span class="product-status ${p.status==='hidden'?'hidden-status':'active-status'}">${status}</span></td><td>${p.featured?'Yes':'No'}</td><td><button title="Edit" class="icon-action edit-product" data-i="${i}"><i class="fa-solid fa-pen"></i></button><button title="Duplicate" class="icon-action duplicate-product" data-i="${i}"><i class="fa-solid fa-copy"></i></button><button title="Adjust stock" class="icon-action stock-product" data-i="${i}"><i class="fa-solid fa-boxes-stacked"></i></button><button title="Delete" class="icon-action danger delete-product" data-i="${i}"><i class="fa-solid fa-trash"></i></button></td></tr>`;
    }).join('')||`<tr><td colspan="8" class="empty">No products match your filters.</td></tr>`;
    $$('.edit-product').forEach(b=>b.onclick=()=>openProduct(+b.dataset.i));
    $$('.delete-product').forEach(b=>b.onclick=()=>deleteProduct(+b.dataset.i));
    $$('.duplicate-product').forEach(b=>b.onclick=()=>duplicateProduct(+b.dataset.i));
    $$('.stock-product').forEach(b=>b.onclick=()=>adjustStock(+b.dataset.i));
    $$('.product-check').forEach(c=>c.onchange=saveSelectedProducts);
    updateSelectedCount();
  }
  function saveSelectedProducts(){const ids=$$('.product-check:checked').map(x=>x.dataset.i);write('elegance-selected-products',ids);updateSelectedCount();}
  function updateSelectedCount(){const n=$$('.product-check:checked').length;$('#selectedProductCount').textContent=`${n} selected`;const h=$('#productsHeaderCheck');const a=$$('.product-check');if(h){h.checked=a.length>0&&n===a.length;h.indeterminate=n>0&&n<a.length}}
  function openProduct(index=null){
    const p=index===null?normalizeProduct({id:'',name:'',price:'$0',salePrice:'',notes:'',img:'',category:'unisex',collections:['unisex'],featured:false}):normalizeProduct(products()[index]);
    $('#productModal').hidden=false;$('#productModalTitle').textContent=index===null?'Add Product':'Edit Product';$('#productIndex').value=index??'';
    $('#pId').value=p.id||'';$('#pSku').value=p.sku||'';$('#pName').value=p.name||'';$('#pBrand').value=p.brand||'ÉLÉGANCE';$('#pPrice').value=String(p.price||'').replace(/[^0-9.]/g,'');$('#pSale').value=String(p.salePrice||'').replace(/[^0-9.]/g,'');$('#pStock').value=p.stock||0;$('#pStatus').value=p.status||'active';$('#pCategory').value=p.category||'unisex';$('#pCollections').value=(p.collections||[]).join(', ');$('#pSize').value=p.size||'';$('#pImage').value=p.img||'';$('#pDescription').value=p.description||'';$('#pNotes').value=p.notes||'';$('#pTags').value=(p.tags||[]).join(', ');$('#pFeatured').checked=!!p.featured;$('#pLowStock').checked=!!p.lowStock;
  }
  function closeProduct(){$('#productModal').hidden=true}
  $('#addProductBtn').onclick=()=>openProduct(); $('#closeProduct').onclick=closeProduct; $('#cancelProduct').onclick=closeProduct;
  $('#productForm').addEventListener('submit',e=>{e.preventDefault();const ps=products();const obj=normalizeProduct({id:$('#pId').value.trim()||('product-'+Date.now()),sku:$('#pSku').value.trim(),name:$('#pName').value.trim(),brand:$('#pBrand').value.trim()||'ÉLÉGANCE',price:money($('#pPrice').value),salePrice:$('#pSale').value.trim()?money($('#pSale').value):'',stock:Math.max(0,parseInt($('#pStock').value||'0',10)),status:$('#pStatus').value,category:$('#pCategory').value,collections:$('#pCollections').value.split(',').map(x=>x.trim()).filter(Boolean),size:$('#pSize').value.trim(),img:$('#pImage').value.trim(),description:$('#pDescription').value.trim(),notes:$('#pNotes').value.trim(),tags:$('#pTags').value.split(',').map(x=>x.trim()).filter(Boolean),featured:$('#pFeatured').checked,lowStock:$('#pLowStock').checked});if(!obj.name){toast('Product name is required');return}const idx=$('#productIndex').value===''?null:Number($('#productIndex').value);if(idx===null)ps.push(obj);else ps[idx]=obj;write(PRODUCTS_KEY,ps);window.ELEGANCE_PRODUCTS.products=ps;closeProduct();renderProducts();renderDashboard();toast(idx===null?'Product added':'Product updated');});
  function duplicateProduct(i){const ps=products(), p=normalizeProduct(ps[i]);const copy={...p,id:`${p.id||'product'}-copy-${Date.now()}`,sku:p.sku?`${p.sku}-COPY`:'',name:`${p.name} Copy`,featured:false};ps.splice(i+1,0,copy);write(PRODUCTS_KEY,ps);window.ELEGANCE_PRODUCTS.products=ps;renderProducts();renderDashboard();toast('Product duplicated')}
  function adjustStock(i){const ps=products(), p=normalizeProduct(ps[i]);const value=prompt(`Enter new stock quantity for “${p.name}”:`,String(p.stock));if(value===null)return;const n=parseInt(value,10);if(!Number.isFinite(n)||n<0){toast('Enter a valid stock quantity');return}p.stock=n;ps[i]=p;write(PRODUCTS_KEY,ps);window.ELEGANCE_PRODUCTS.products=ps;renderProducts();renderDashboard();toast('Stock updated')}
  function deleteProduct(i){const ps=products();if(!confirm(`Delete “${ps[i].name}”?`))return;ps.splice(i,1);write(PRODUCTS_KEY,ps);window.ELEGANCE_PRODUCTS.products=ps;write('elegance-selected-products',[]);renderProducts();renderDashboard();toast('Product deleted')}
  $('#bulkDeleteProducts').onclick=()=>{const ids=$$('.product-check:checked').map(x=>Number(x.dataset.i)).sort((a,b)=>b-a);if(!ids.length){toast('Select products first');return}if(!confirm(`Delete ${ids.length} selected product(s)?`))return;const ps=products();ids.forEach(i=>ps.splice(i,1));write(PRODUCTS_KEY,ps);window.ELEGANCE_PRODUCTS.products=ps;write('elegance-selected-products',[]);renderProducts();renderDashboard();toast('Selected products deleted')};
  $('#selectAllProducts').onchange=e=>{$$('.product-check').forEach(c=>c.checked=e.target.checked);saveSelectedProducts()};
  $('#productsHeaderCheck').onchange=e=>{$$('.product-check').forEach(c=>c.checked=e.target.checked);saveSelectedProducts()};
  ['productSearch','productCategoryFilter','productStatusFilter','productSort'].forEach(id=>$('#'+id).addEventListener('input',renderProducts));
  $('#clearProductFilters').onclick=()=>{$('#productSearch').value='';$('#productCategoryFilter').value='';$('#productStatusFilter').value='';$('#productSort').value='name';renderProducts()};

  function renderOrders(){const os=orders().slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));$('#orderCount').textContent=os.length;$('#ordersTable').innerHTML=os.map((o,i)=>`<tr><td><strong>${esc(o.reference)}</strong><small>${new Date(o.createdAt).toLocaleString()}</small></td><td>${esc((o.customer?.firstName||'')+' '+(o.customer?.lastName||''))}<small>${esc(o.customer?.email||'')}</small></td><td>${money(o.total)}</td><td><select class="status-select" data-i="${i}">${['New','Processing','Shipped','Delivered','Cancelled'].map(s=>`<option ${s===(o.status||'New')?'selected':''}>${s}</option>`).join('')}</select></td><td><button class="view-order icon-action" data-i="${i}"><i class="fa-solid fa-eye"></i></button><button class="delete-order icon-action danger" data-i="${i}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')||`<tr><td colspan="5" class="empty">No orders yet.</td></tr>`;$$('.status-select').forEach(s=>s.onchange=async ()=>{
      const arr=orders().slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      const order=arr[+s.dataset.i]; if(!order)return;
      const previous=order.status||'New'; order.status=s.value; write(ORDERS_KEY,arr); renderOrders(); renderDashboard();
      try{
        const r=await apiRequest('/api/orders/'+encodeURIComponent(order.reference)+'/status',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:s.value})});
        const result=await r.json(); if(!r.ok) throw new Error(result.error||'Update failed');
        toast(result.email?.sent?'Order status updated + email sent':'Order status updated');
      }catch(e){ order.status=previous; write(ORDERS_KEY,arr); renderOrders(); renderDashboard(); toast('Could not update server order'); }
    });$$('.view-order').forEach(b=>b.onclick=()=>viewOrder(+b.dataset.i));$$('.delete-order').forEach(b=>b.onclick=async ()=>{
      const arr=orders().slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      const order=arr[+b.dataset.i];
      if(!order || !confirm('Delete this order?')) return;
      try{
        const r=await apiRequest('/api/orders/'+encodeURIComponent(order.reference),{method:'DELETE'});
        if(!r.ok) throw new Error();
      }catch(e){toast('Could not delete server order');return;}
      arr.splice(+b.dataset.i,1);write(ORDERS_KEY,arr);renderOrders();renderDashboard();
    })}
  function viewOrder(i){const o=orders().slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[i];$('#orderDetails').hidden=false;$('#orderDetailsBody').innerHTML=`<div class="detail-grid"><div><span>Order</span><strong>${esc(o.reference)}</strong></div><div><span>Date</span><strong>${new Date(o.createdAt).toLocaleString()}</strong></div><div><span>Customer</span><strong>${esc((o.customer?.firstName||'')+' '+(o.customer?.lastName||''))}</strong></div><div><span>Phone</span><strong>${esc(o.customer?.phone||'')}</strong></div><div><span>Email</span><strong>${esc(o.customer?.email||'')}</strong></div><div><span>Payment</span><strong>${esc(o.payment||'COD')}</strong></div><div class="full"><span>Address</span><strong>${esc([o.customer?.address,o.customer?.city,o.customer?.postal,o.customer?.country].filter(Boolean).join(', '))}</strong></div></div><h4>Items</h4><div class="order-items">${(o.items||[]).map(x=>`<div><span>${esc(x.name)} × ${x.qty}</span><strong>${money((x.price||0)*x.qty)}</strong></div>`).join('')}</div><div class="order-total"><span>Total</span><strong>${money(o.total)}</strong></div>`}
  $('#closeOrder').onclick=()=>$('#orderDetails').hidden=true;
  function renderCustomers(){const os=orders(), map={};os.forEach(o=>{const c=o.customer||{};const k=c.email||c.phone||o.reference;map[k]??={name:[c.firstName,c.lastName].filter(Boolean).join(' '),email:c.email||'',phone:c.phone||'',orders:0,spent:0};map[k].orders++;map[k].spent+=Number(o.total)||0});const cs=Object.values(map);$('#customerCount').textContent=cs.length;$('#customersTable').innerHTML=cs.map(c=>`<tr><td><strong>${esc(c.name||'Guest')}</strong></td><td>${esc(c.email)}</td><td>${esc(c.phone)}</td><td>${c.orders}</td><td>${money(c.spent)}</td></tr>`).join('')||`<tr><td colspan="5" class="empty">No customers yet.</td></tr>`}
  $('#settingsForm').addEventListener('submit',e=>{e.preventDefault();write(SETTINGS_KEY,{storeName:$('#sStore').value,currency:$('#sCurrency').value,adminEmail:$('#sEmail').value});toast('Settings saved')});
  function loadSettings(){const s=settings();$('#sStore').value=s.storeName;$('#sCurrency').value=s.currency;$('#sEmail').value=s.adminEmail}
  $('#exportProducts').onclick=()=>download('elegance-products.json',JSON.stringify(products(),null,2),'application/json');
  $('#exportOrders').onclick=()=>download('elegance-orders.json',JSON.stringify(orders(),null,2),'application/json');
  $('#importProducts').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(r.result);if(!Array.isArray(p))throw 0;write(PRODUCTS_KEY,p);window.ELEGANCE_PRODUCTS.products=p;renderProducts();renderDashboard();toast('Products imported')}catch(_){toast('Invalid product JSON')}};r.readAsText(f)};
  function download(name,data,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
  function toast(msg){const t=$('#adminToast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
  function renderAll(){loadSettings();renderDashboard();renderProducts();renderOrders();renderCustomers();nav('dashboard')}
})();
