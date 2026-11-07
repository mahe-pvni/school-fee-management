const $ = (s) => document.querySelector(s);
const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", {minimumFractionDigits:2, maximumFractionDigits:2});
const dateToday = new Date().toISOString().slice(0,10);
$("#payment-date").value = dateToday;

async function api(url, options={}) {
  const response = await fetch(url, { headers: {"Content-Type":"application/json"}, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
function toast(message) {
  const el=$("#toast"); el.textContent=message; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),3200);
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function showView(view) {
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("hidden",v.id!==view));
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const labels={dashboard:"Dashboard",students:"Students",fees:"Fee Details",payments:"Payments",reports:"Reports"};
  $("#page-title").textContent=labels[view] || "Dashboard";
  if(view==="dashboard") loadDashboard();
  if(view==="students") loadStudents();
  if(view==="fees") { loadStudents(); loadFees(); }
  if(view==="payments") { loadFees(); loadPayments(); }
  if(view==="reports") loadReports();
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));

async function loadDashboard(){
  try{const d=await api("/api/dashboard");
    $("#stat-students").textContent=d.students;
    $("#stat-assigned").textContent=money(d.assigned);
    $("#stat-collected").textContent=money(d.collected);
    $("#stat-pending").textContent=money(d.pending);
  }catch(e){toast(e.message)}
}
async function loadStudents(){
  try{const rows=await api("/api/students");
    window.studentRows=rows;
    renderStudents(rows);
    $("#fee-student").innerHTML='<option value="">Select student</option>'+rows.map(s=>`<option value="${s.student_id}">${escapeHtml(s.name)} · ${escapeHtml(s.class)} / ${escapeHtml(s.roll_no)}</option>`).join("");
  }catch(e){toast(e.message)}
}
function renderStudents(rows){
  $("#students-body").innerHTML=rows.length?rows.map(s=>`<tr><td>${s.student_id}</td><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.class)}</td><td>${escapeHtml(s.roll_no)}</td><td>${escapeHtml(s.phone)}</td><td>${escapeHtml(s.email)}</td><td><button class="delete" data-delete="${s.student_id}">Delete</button></td></tr>`).join(""):'<tr><td colspan="7">No students found.</td></tr>';
}
$("#student-search").addEventListener("input",e=>{
  const q=e.target.value.toLowerCase();
  renderStudents((window.studentRows||[]).filter(s=>[s.name,s.class,s.roll_no,s.phone].some(v=>String(v||"").toLowerCase().includes(q))));
});
$("#students-body").addEventListener("click",async e=>{
  const id=e.target.dataset.delete;if(!id)return;
  if(!confirm("Delete this student and their related fee/payment records?"))return;
  try{await api("/api/students/"+id,{method:"DELETE"});toast("Student deleted.");loadStudents();}catch(err){toast(err.message)}
});
$("#student-form").addEventListener("submit",async e=>{
  e.preventDefault();const body=Object.fromEntries(new FormData(e.target).entries());
  try{await api("/api/students",{method:"POST",body:JSON.stringify(body)});e.target.reset();toast("Student added successfully.");loadStudents();}catch(err){toast(err.message)}
});
async function loadFees(){
  try{const rows=await api("/api/fees");
    $("#fees-body").innerHTML=rows.length?rows.map(f=>`<tr><td>${escapeHtml(f.name)}</td><td>${escapeHtml(f.class)} / ${escapeHtml(f.roll_no)}</td><td>${escapeHtml(f.academic_year)}</td><td>${escapeHtml(f.fee_type)}</td><td>${money(f.total_amount)}</td><td>${money(f.paid_amount)}</td><td>${money(f.pending_amount)}</td><td>${f.due_date?new Date(f.due_date).toLocaleDateString("en-IN"):"—"}</td></tr>`).join(""):'<tr><td colspan="8">No fee records found.</td></tr>';
    $("#payment-fee").innerHTML='<option value="">Select fee record</option>'+rows.filter(f=>Number(f.pending_amount)>0).map(f=>`<option value="${f.fee_id}">${escapeHtml(f.name)} · ${escapeHtml(f.fee_type)} · Pending ${money(f.pending_amount)}</option>`).join("");
  }catch(e){toast(e.message)}
}
$("#fee-form").addEventListener("submit",async e=>{
  e.preventDefault();const body=Object.fromEntries(new FormData(e.target).entries());
  try{await api("/api/fees",{method:"POST",body:JSON.stringify(body)});e.target.reset();toast("Fee assigned successfully.");loadFees();}catch(err){toast(err.message)}
});
$("#payment-form").addEventListener("submit",async e=>{
  e.preventDefault();const body=Object.fromEntries(new FormData(e.target).entries());
  try{const result=await api("/api/payments",{method:"POST",body:JSON.stringify(body)});e.target.reset();$("#payment-date").value=dateToday;toast(`Payment saved. Receipt: ${result.receipt_no}`);loadFees();loadPayments();}catch(err){toast(err.message)}
});
async function loadPayments(){
  try{const rows=await api("/api/payments");
    $("#payments-body").innerHTML=rows.length?rows.map(p=>`<tr><td>${escapeHtml(p.receipt_no)}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.fee_type)}</td><td>${money(p.amount_paid)}</td><td>${new Date(p.payment_date).toLocaleDateString("en-IN")}</td><td>${escapeHtml(p.payment_method)}</td><td><span class="badge">${escapeHtml(p.payment_status)}</span></td></tr>`).join(""):'<tr><td colspan="7">No payments recorded.</td></tr>';
  }catch(e){toast(e.message)}
}
async function loadReports(){
  try{const rows=await api("/api/reports");
    $("#reports-body").innerHTML=rows.length?rows.map(r=>`<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.class)}</td><td>${escapeHtml(r.roll_no)}</td><td>${money(r.total_fee)}</td><td>${money(r.paid_amount)}</td><td>${money(r.pending_amount)}</td></tr>`).join(""):'<tr><td colspan="6">No fee reports available.</td></tr>';
  }catch(e){toast(e.message)}
}
$("#print-report").addEventListener("click",()=>window.print());
loadDashboard();
