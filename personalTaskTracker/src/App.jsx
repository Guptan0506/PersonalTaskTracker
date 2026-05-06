import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

const supabase = createClient(
  "https://yjnzjrltkfjewqnajlsr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqbnpqcmx0a2ZlandxbmFqbHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMDc5MDAsImV4cCI6MjA5MzY4MzkwMH0.XLVgXMSuJrwDk44P2VopfVKRNUWWjLO3kJt8solwmpY"
);

const COLORS = [
  {card:'#FFF9E6',dot:'#BA7517',check:'#EF9F27',border:'#FAC77566'},
  {card:'#E8F5FF',dot:'#185FA5',check:'#378ADD',border:'#85B7EB66'},
  {card:'#F0FBF5',dot:'#0F6E56',check:'#1D9E75',border:'#5DCAA566'},
  {card:'#FDF0F8',dot:'#993556',check:'#D4537E',border:'#ED93B166'},
  {card:'#F2F0FF',dot:'#534AB7',check:'#7F77DD',border:'#AFA9EC66'},
  {card:'#FFF0ED',dot:'#993C1D',check:'#D85A30',border:'#F0997B66'},
];

function genId(){ return Math.random().toString(36).slice(2,9); }

// ── Auth Screen ────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async()=>{
    setError(''); setLoading(true);
    const fn = mode==='login'
      ? supabase.auth.signInWithPassword({email,password})
      : supabase.auth.signUp({email,password});
    const {data,error:err} = await fn;
    setLoading(false);
    if(err){ setError(err.message); return; }
    if(mode==='signup' && !data.session){
      setError('Check your email to confirm your account, then log in.');
      setMode('login');
      return;
    }
    onAuth(data.session);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">📌</div>
        <h1 className="auth-title">My Pinboard</h1>
        <p className="auth-sub">{mode==='login'?'Welcome back':'Create your account'}</p>
        <input className="input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&submit()}/>
        {error && <p className="auth-error">{error}</p>}
        <button className="btn-primary full" onClick={submit} disabled={loading}>
          {loading ? 'Please wait…' : mode==='login' ? 'Log in' : 'Sign up'}
        </button>
        <p className="auth-toggle">
          {mode==='login'?'No account? ':'Already have one? '}
          <span onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');}}>
            {mode==='login'?'Sign up':'Log in'}
          </span>
        </p>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App(){
  const [session, setSession] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!session){ setLoading(false); return; }
    loadProjects();
  },[session]);

  const loadProjects = async()=>{
    setLoading(true);
    const {data:projs} = await supabase.from('projects').select('*').order('created_at');
    const {data:taskRows} = await supabase.from('tasks').select('*').order('position');
    const merged = (projs||[]).map(p=>({
      ...p,
      color: p.color,
      tasks: (taskRows||[]).filter(t=>t.project_id===p.id),
      newTask:'',
    }));
    setProjects(merged);
    setLoading(false);
  };

  const addProject = async()=>{
    const name = newName.trim();
    if(!name) return;
    const color = COLORS[projects.length % COLORS.length];
    const {data,error} = await supabase.from('projects').insert({
      name, color, user_id: session.user.id
    }).select().single();
    if(error||!data) return;
    setProjects(ps=>[...ps,{...data,tasks:[],newTask:''}]);
    setNewName(''); setAdding(false);
  };

  const delProject = async(id)=>{
    await supabase.from('projects').delete().eq('id',id);
    setProjects(ps=>ps.filter(p=>p.id!==id));
  };

  const renameProject = async(id, name)=>{
    if(!name.trim()) return;
    await supabase.from('projects').update({name:name.trim()}).eq('id',id);
    setProjects(ps=>ps.map(p=>p.id===id?{...p,name:name.trim()}:p));
  };

  const setTaskInput = (id,val)=>
    setProjects(ps=>ps.map(p=>p.id===id?{...p,newTask:val}:p));

  const addTask = async(id)=>{
    const proj = projects.find(p=>p.id===id);
    const title = proj?.newTask?.trim();
    if(!title) return;
    const pos = proj.tasks.length;
    const {data,error} = await supabase.from('tasks').insert({
      project_id:id, title, done:false, position:pos
    }).select().single();
    if(error||!data) return;
    setProjects(ps=>ps.map(p=>p.id===id?{...p,tasks:[...p.tasks,data],newTask:''}:p));
  };

  const toggleTask = async(pid,tid,done)=>{
    await supabase.from('tasks').update({done}).eq('id',tid);
    setProjects(ps=>ps.map(p=>p.id===pid?{...p,tasks:p.tasks.map(t=>t.id===tid?{...t,done}:t)}:p));
  };

  const delTask = async(pid,tid)=>{
    await supabase.from('tasks').delete().eq('id',tid);
    setProjects(ps=>ps.map(p=>p.id===pid?{...p,tasks:p.tasks.filter(t=>t.id!==tid)}:p));
  };

  const signOut = ()=> supabase.auth.signOut();

  if(!session) return <AuthScreen onAuth={setSession}/>;
  if(loading) return <div className="loading">Loading your board…</div>;

  return (
    <div className="app">
      <div className="header">
        <span className="header-title">📌 My Pinboard</span>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span className="user-email">{session.user.email}</span>
          <button className="btn-ghost" onClick={signOut}>Sign out</button>
          <button className="btn-primary" onClick={()=>setAdding(true)}>+ New project</button>
        </div>
      </div>

      {adding && (
        <div className="add-row">
          <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter')addProject();if(e.key==='Escape'){setAdding(false);setNewName('');}}}
            placeholder="Project name…" className="input"/>
          <button className="btn-primary" onClick={addProject}>Add</button>
          <button className="btn-ghost" onClick={()=>{setAdding(false);setNewName('');}}>Cancel</button>
        </div>
      )}

      {projects.length===0 && !adding && (
        <div className="empty">
          <span>📌</span>
          <p>Your pinboard is empty — create your first project!</p>
        </div>
      )}

      <div className="board">
        {projects.map(p=>(
          <ProjectCard key={p.id} proj={p}
            onDelete={()=>delProject(p.id)}
            onToggle={(tid,done)=>toggleTask(p.id,tid,done)}
            onDelTask={(tid)=>delTask(p.id,tid)}
            onTaskInput={(v)=>setTaskInput(p.id,v)}
            onAddTask={()=>addTask(p.id)}
            onRename={(n)=>renameProject(p.id,n)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Project Card ───────────────────────────────────────────────────────────
function ProjectCard({proj,onDelete,onToggle,onDelTask,onTaskInput,onAddTask,onRename}){
  const {color,tasks,name,newTask} = proj;
  const done = tasks.filter(t=>t.done).length;
  const total = tasks.length;
  const pct = total ? Math.round((done/total)*100) : 0;
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(name);

  return (
    <div className="card" style={{background:color.card,border:`1px solid ${color.border}`}}>
      <div className="card-header">
        <span className="dot" style={{background:color.dot}}></span>
        <div className="card-title-wrap">
          {editing?(
            <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)}
              onBlur={()=>{onRename(editVal);setEditing(false);}}
              onKeyDown={e=>{if(e.key==='Enter'){onRename(editVal);setEditing(false);}if(e.key==='Escape')setEditing(false);}}
              className="title-input" style={{borderBottomColor:color.dot}}/>
          ):(
            <span className="card-title" onDoubleClick={()=>{setEditing(true);setEditVal(name);}}>{name}</span>
          )}
          {total>0&&<span className="card-count" style={{color:color.dot}}>{done}/{total} done</span>}
        </div>
        <button className="del-btn" onClick={onDelete}>×</button>
      </div>
      {total>0&&(
        <div className="progress-track">
          <div className="progress-bar" style={{width:`${pct}%`,background:color.dot}}></div>
        </div>
      )}
      <div className="task-list">
        {tasks.filter(t=>!t.done).map(t=>(
          <TaskItem key={t.id} task={t} color={color} onToggle={()=>onToggle(t.id,!t.done)} onDel={()=>onDelTask(t.id)}/>
        ))}
        {tasks.filter(t=>t.done).map(t=>(
          <TaskItem key={t.id} task={t} color={color} onToggle={()=>onToggle(t.id,!t.done)} onDel={()=>onDelTask(t.id)}/>
        ))}
      </div>
      <div className="add-task-row">
        <input value={newTask||''} onChange={e=>onTaskInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&onAddTask()}
          placeholder="Add task…" className="task-input"
          style={{border:`0.5px solid ${color.border}`}}/>
        <button className="add-task-btn" style={{background:color.dot}} onClick={onAddTask}>+</button>
      </div>
    </div>
  );
}

// ── Task Item ──────────────────────────────────────────────────────────────
function TaskItem({task,color,onToggle,onDel}){
  const [hover,setHover]=useState(false);
  return(
    <div className="task-item" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <div className="task-check" onClick={onToggle}
        style={{border:`1.5px solid ${task.done?color.check:'rgba(0,0,0,0.2)'}`,background:task.done?color.check:'transparent'}}>
        {task.done&&<span className="check-mark">✓</span>}
      </div>
      <span className="task-title" style={{color:task.done?'rgba(0,0,0,0.35)':'#1a1a1a',textDecoration:task.done?'line-through':'none'}}>{task.title}</span>
      {hover&&<button className="task-del" onClick={onDel}>×</button>}
    </div>
  );
}