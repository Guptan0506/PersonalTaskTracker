import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

const supabase = createClient(
  "https://yjnzjrltkfejwqnajlsr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqbnpqcmx0a2ZlandxbmFqbHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMDc5MDAsImV4cCI6MjA5MzY4MzkwMH0.XLVgXMSuJrwDk44P2VopfVKRNUWWjLO3kJt8solwmpY"
);

const COLORS = [
  {card:'#ffffff',dot:'#2563eb',check:'#1d4ed8',border:'#bfdbfe'},
  {card:'#f0f7ff',dot:'#0f766e',check:'#0f9f8f',border:'#99f6e4'},
  {card:'#f8fbff',dot:'#7c3aed',check:'#6d28d9',border:'#ddd6fe'},
  {card:'#f8fafc',dot:'#ea580c',check:'#f97316',border:'#fed7aa'},
  {card:'#f7fdf9',dot:'#15803d',check:'#16a34a',border:'#bbf7d0'},
  {card:'#fffaf5',dot:'#c2410c',check:'#ea580c',border:'#fdba74'},
];

// ── Auth ───────────────────────────────────────────────────────────────────
function AuthScreen({onAuth}){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [mode,setMode]=useState('login');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  const submit=async()=>{
    setError('');setLoading(true);
    const fn=mode==='login'
      ?supabase.auth.signInWithPassword({email,password})
      :supabase.auth.signUp({email,password});
    const {data,error:err}=await fn;
    setLoading(false);
    if(err){setError(err.message);return;}
    if(mode==='signup'&&!data.session){setError('Check your email to confirm, then log in.');setMode('login');return;}
    onAuth(data.session);
  };

  return(
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">📌</div>
        <h1 className="auth-title">My Pinboard</h1>
        <p className="auth-sub">{mode==='login'?'Welcome back':'Create your account'}</p>
        <input className="input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
        {error&&<p className="auth-error">{error}</p>}
        <button className="btn-primary full" onClick={submit} disabled={loading}>{loading?'Please wait…':mode==='login'?'Log in':'Sign up'}</button>
        <p className="auth-toggle">{mode==='login'?'No account? ':'Already have one? '}<span onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');}}>{mode==='login'?'Sign up':'Log in'}</span></p>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App(){
  const [session,setSession]=useState(null);
  const [projects,setProjects]=useState([]);
  const [loading,setLoading]=useState(true);
  const [adding,setAdding]=useState(false);
  const [newName,setNewName]=useState('');

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!session){setLoading(false);return;}
    loadProjects();
  },[session]);

  const loadProjects=async()=>{
    setLoading(true);
    const {data:projs}=await supabase.from('projects').select('*').order('created_at');
    const {data:taskRows}=await supabase.from('tasks').select('*').order('position');
    const {data:resRows}=await supabase.from('resources').select('*').order('created_at');
    const merged=(projs||[]).map(p=>({
      ...p,
      tasks:(taskRows||[]).filter(t=>t.project_id===p.id),
      resources:(resRows||[]).filter(r=>r.project_id===p.id),
      newTask:'',
    }));
    setProjects(merged);
    setLoading(false);
  };

  const addProject=async()=>{
    const name=newName.trim();
    if(!name)return;
    const color=COLORS[projects.length%COLORS.length];
    const {data,error}=await supabase.from('projects').insert({name,color,user_id:session.user.id}).select().single();
    if(error||!data)return;
    setProjects(ps=>[...ps,{...data,tasks:[],resources:[],newTask:''}]);
    setNewName('');setAdding(false);
  };

  const delProject=async(id)=>{
    await supabase.from('projects').delete().eq('id',id);
    setProjects(ps=>ps.filter(p=>p.id!==id));
  };

  const renameProject=async(id,name)=>{
    if(!name.trim())return;
    await supabase.from('projects').update({name:name.trim()}).eq('id',id);
    setProjects(ps=>ps.map(p=>p.id===id?{...p,name:name.trim()}:p));
  };

  const setTaskInput=(id,val)=>setProjects(ps=>ps.map(p=>p.id===id?{...p,newTask:val}:p));

  const addTask=async(id)=>{
    const proj=projects.find(p=>p.id===id);
    const title=proj?.newTask?.trim();
    if(!title)return;
    const {data,error}=await supabase.from('tasks').insert({project_id:id,title,done:false,position:proj.tasks.length}).select().single();
    if(error||!data)return;
    setProjects(ps=>ps.map(p=>p.id===id?{...p,tasks:[...p.tasks,data],newTask:''}:p));
  };

  const toggleTask=async(pid,tid,done)=>{
    await supabase.from('tasks').update({done}).eq('id',tid);
    setProjects(ps=>ps.map(p=>p.id===pid?{...p,tasks:p.tasks.map(t=>t.id===tid?{...t,done}:t)}:p));
  };

  const delTask=async(pid,tid)=>{
    await supabase.from('tasks').delete().eq('id',tid);
    setProjects(ps=>ps.map(p=>p.id===pid?{...p,tasks:p.tasks.filter(t=>t.id!==tid)}:p));
  };

  const addResource=async(pid,type,label,content)=>{
    const {data,error}=await supabase.from('resources').insert({project_id:pid,type,label,content}).select().single();
    if(error||!data)return;
    setProjects(ps=>ps.map(p=>p.id===pid?{...p,resources:[...p.resources,data]}:p));
  };

  const delResource=async(pid,rid)=>{
    const proj=projects.find(p=>p.id===pid);
    const res=proj?.resources.find(r=>r.id===rid);
    if(res?.type==='file'){
      await supabase.storage.from('resources').remove([res.content]);
    }
    await supabase.from('resources').delete().eq('id',rid);
    setProjects(ps=>ps.map(p=>p.id===pid?{...p,resources:p.resources.filter(r=>r.id!==rid)}:p));
  };

  const uploadFile=async(pid,file)=>{
    const path=`${session.user.id}/${pid}/${Date.now()}_${file.name}`;
    const {error}=await supabase.storage.from('resources').upload(path,file);
    if(error)return;
    const {data:urlData}=supabase.storage.from('resources').getPublicUrl(path);
    await addResource(pid,'file',file.name,urlData.publicUrl);
  };

  const signOut=()=>supabase.auth.signOut();

  if(!session)return<AuthScreen onAuth={setSession}/>;
  if(loading)return<div className="loading">Loading your board…</div>;

  return(
    <div className="app">
      <div className="header">
        <span className="header-title">📌 My Pinboard</span>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span className="user-email">{session.user.email}</span>
          <button className="btn-ghost" onClick={signOut}>Sign out</button>
          <button className="btn-primary" onClick={()=>setAdding(true)}>+ New project</button>
        </div>
      </div>

      {adding&&(
        <div className="add-row">
          <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter')addProject();if(e.key==='Escape'){setAdding(false);setNewName('');}}}
            placeholder="Project name…" className="input"/>
          <button className="btn-primary" onClick={addProject}>Add</button>
          <button className="btn-ghost" onClick={()=>{setAdding(false);setNewName('');}}>Cancel</button>
        </div>
      )}

      {projects.length===0&&!adding&&(
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
            onAddResource={(type,label,content)=>addResource(p.id,type,label,content)}
            onDelResource={(rid)=>delResource(p.id,rid)}
            onUploadFile={(file)=>uploadFile(p.id,file)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Project Card ───────────────────────────────────────────────────────────
function ProjectCard({proj,onDelete,onToggle,onDelTask,onTaskInput,onAddTask,onRename,onAddResource,onDelResource,onUploadFile}){
  const {color,tasks,resources,name,newTask}=proj;
  const done=tasks.filter(t=>t.done).length;
  const total=tasks.length;
  const pct=total?Math.round((done/total)*100):0;
  const [editing,setEditing]=useState(false);
  const [editVal,setEditVal]=useState(name);
  const [showRes,setShowRes]=useState(false);
  const [resTab,setResTab]=useState('link');
  const [linkUrl,setLinkUrl]=useState('');
  const [linkLabel,setLinkLabel]=useState('');
  const [noteText,setNoteText]=useState('');

  const submitLink=()=>{
    if(!linkUrl.trim())return;
    onAddResource('link',linkLabel||linkUrl,linkUrl.trim());
    setLinkUrl('');setLinkLabel('');
  };

  const submitNote=()=>{
    if(!noteText.trim())return;
    onAddResource('note','Note',noteText.trim());
    setNoteText('');
  };

  return(
    <div className="card" style={{background:color.card,border:`1px solid ${color.border}`}}>
      {/* Header */}
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

      {/* Progress */}
      {total>0&&(
        <div className="progress-track">
          <div className="progress-bar" style={{width:`${pct}%`,background:color.dot}}></div>
        </div>
      )}

      {/* Tasks */}
      <div className="task-list">
        {tasks.filter(t=>!t.done).map(t=>(
          <TaskItem key={t.id} task={t} color={color} onToggle={()=>onToggle(t.id,!t.done)} onDel={()=>onDelTask(t.id)}/>
        ))}
        {tasks.filter(t=>t.done).map(t=>(
          <TaskItem key={t.id} task={t} color={color} onToggle={()=>onToggle(t.id,!t.done)} onDel={()=>onDelTask(t.id)}/>
        ))}
      </div>

      {/* Add task */}
      <div className="add-task-row">
        <input value={newTask||''} onChange={e=>onTaskInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&onAddTask()}
          placeholder="Add task…" className="task-input"
          style={{border:`0.5px solid ${color.border}`}}/>
        <button className="add-task-btn" style={{background:color.dot}} onClick={onAddTask}>+</button>
      </div>

      {/* Resources toggle */}
      <button className="res-toggle" style={{color:color.dot,borderTopColor:color.border}} onClick={()=>setShowRes(s=>!s)}>
        📎 Resources {resources.length>0&&<span className="res-count">{resources.length}</span>}
        <span style={{marginLeft:'auto'}}>{showRes?'▲':'▼'}</span>
      </button>

      {showRes&&(
        <div className="res-panel">
          {/* Existing resources */}
          {resources.length>0&&(
            <div className="res-list">
              {resources.map(r=>(
                <div key={r.id} className="res-item">
                  <span className="res-icon">{r.type==='link'?'🔗':r.type==='note'?'📝':'📄'}</span>
                  <span className="res-label">
                    {r.type==='link'||r.type==='file'
                      ?<a href={r.content} target="_blank" rel="noreferrer">{r.label||r.content}</a>
                      :<span title={r.content}>{r.content.length>40?r.content.slice(0,40)+'…':r.content}</span>
                    }
                  </span>
                  <button className="task-del" onClick={()=>onDelResource(r.id)}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="res-tabs">
            {['link','note','file'].map(t=>(
              <button key={t} className={`res-tab ${resTab===t?'active':''}`}
                style={resTab===t?{borderBottomColor:color.dot,color:color.dot}:{}}
                onClick={()=>setResTab(t)}>
                {t==='link'?'🔗 Link':t==='note'?'📝 Note':'📄 File'}
              </button>
            ))}
          </div>

          {resTab==='link'&&(
            <div className="res-form">
              <input className="task-input" style={{border:`0.5px solid ${color.border}`,width:'100%',marginBottom:5}} placeholder="URL" value={linkUrl} onChange={e=>setLinkUrl(e.target.value)}/>
              <input className="task-input" style={{border:`0.5px solid ${color.border}`,width:'100%',marginBottom:5}} placeholder="Label (optional)" value={linkLabel} onChange={e=>setLinkLabel(e.target.value)}/>
              <button className="add-task-btn" style={{background:color.dot,width:'100%',padding:'6px'}} onClick={submitLink}>Add link</button>
            </div>
          )}

          {resTab==='note'&&(
            <div className="res-form">
              <textarea className="task-input" style={{border:`0.5px solid ${color.border}`,width:'100%',marginBottom:5,resize:'vertical',minHeight:60}} placeholder="Write a note…" value={noteText} onChange={e=>setNoteText(e.target.value)}/>
              <button className="add-task-btn" style={{background:color.dot,width:'100%',padding:'6px'}} onClick={submitNote}>Save note</button>
            </div>
          )}

          {resTab==='file'&&(
            <div className="res-form">
              <label className="file-label" style={{borderColor:color.border}}>
                <span>Click to upload a file</span>
                <input type="file" style={{display:'none'}} onChange={e=>{if(e.target.files[0])onUploadFile(e.target.files[0]);}}/>
              </label>
            </div>
          )}
        </div>
      )}
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