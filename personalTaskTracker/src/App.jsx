import { useState, useEffect, useCallback } from "react";

const COLORS = [
  {card:'#FFF9E6',dot:'#BA7517',check:'#EF9F27',border:'#FAC77566'},
  {card:'#E8F5FF',dot:'#185FA5',check:'#378ADD',border:'#85B7EB66'},
  {card:'#F0FBF5',dot:'#0F6E56',check:'#1D9E75',border:'#5DCAA566'},
  {card:'#FDF0F8',dot:'#993556',check:'#D4537E',border:'#ED93B166'},
  {card:'#F2F0FF',dot:'#534AB7',check:'#7F77DD',border:'#AFA9EC66'},
  {card:'#FFF0ED',dot:'#993C1D',check:'#D85A30',border:'#F0997B66'},
];

const STORAGE_KEY = 'pinboard-data-v1';
function genId(){ return Math.random().toString(36).slice(2,9); }

export default function App(){
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(()=>{
    (async()=>{
      try{
        const r = await window.storage.get(STORAGE_KEY);
        if(r?.value) setProjects(JSON.parse(r.value));
      }catch(e){}
      setLoading(false);
    })();
  },[]);

  const save = useCallback(async(p)=>{
    try{ await window.storage.set(STORAGE_KEY, JSON.stringify(p)); }catch(e){}
  },[]);

  const upd = (p)=>{ setProjects(p); save(p); };

  const addProject = ()=>{
    const name = newName.trim();
    if(!name) return;
    const col = COLORS[projects.length % COLORS.length];
    upd([...projects, {id:genId(), name, color:col, tasks:[], newTask:''}]);
    setNewName(''); setAdding(false);
  };

  const delProject = (id)=> upd(projects.filter(p=>p.id!==id));

  const setTaskInput = (id, val)=> setProjects(ps=>ps.map(p=>p.id===id?{...p,newTask:val}:p));

  const addTask = (id)=>{
    const proj = projects.find(p=>p.id===id);
    const t = proj?.newTask?.trim();
    if(!t) return;
    upd(projects.map(p=>p.id===id?{...p,tasks:[...p.tasks,{id:genId(),title:t,done:false}],newTask:''}:p));
  };

  const toggleTask = (pid, tid)=>
    upd(projects.map(p=>p.id===pid?{...p,tasks:p.tasks.map(t=>t.id===tid?{...t,done:!t.done}:t)}:p));

  const delTask = (pid, tid)=>
    upd(projects.map(p=>p.id===pid?{...p,tasks:p.tasks.filter(t=>t.id!==tid)}:p));

  const renameProject = (id, name)=>{
    if(!name.trim()) return;
    upd(projects.map(p=>p.id===id?{...p,name:name.trim()}:p));
  };

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:400,color:'var(--color-text-tertiary)',fontSize:14}}>Loading your board…</div>;

  return (
    <div style={{minHeight:500,fontFamily:'var(--font-sans)',fontSize:14,padding:'20px 4px 24px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,paddingBottom:14,borderBottom:'0.5px solid var(--color-border-tertiary)'}}>
        <span style={{fontWeight:500,fontSize:16}}>📌 My Pinboard</span>
        <button onClick={()=>setAdding(true)}
          style={{padding:'7px 16px',border:'0.5px solid var(--color-border-secondary)',borderRadius:'var(--border-radius-md)',background:'var(--color-text-primary)',color:'var(--color-background-primary)',fontSize:13,cursor:'pointer'}}>
          + New project
        </button>
      </div>

      {adding && (
        <div style={{marginBottom:16,display:'flex',gap:8}}>
          <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter')addProject();if(e.key==='Escape'){setAdding(false);setNewName('');}}}
            placeholder="Project name…"
            style={{flex:1,padding:'8px 12px',border:'0.5px solid var(--color-border-secondary)',borderRadius:'var(--border-radius-md)',background:'var(--color-background-primary)',color:'var(--color-text-primary)',fontSize:13}}/>
          <button onClick={addProject} style={{padding:'8px 16px',borderRadius:'var(--border-radius-md)',border:'0.5px solid var(--color-border-secondary)',background:'var(--color-text-primary)',color:'var(--color-background-primary)',fontSize:13,cursor:'pointer'}}>Add</button>
          <button onClick={()=>{setAdding(false);setNewName('');}} style={{padding:'8px 14px',borderRadius:'var(--border-radius-md)',border:'0.5px solid var(--color-border-secondary)',background:'transparent',color:'var(--color-text-secondary)',fontSize:13,cursor:'pointer'}}>Cancel</button>
        </div>
      )}

      {projects.length===0 && !adding && (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:300,gap:12,color:'var(--color-text-tertiary)'}}>
          <span style={{fontSize:40}}>📌</span>
          <p style={{fontSize:14}}>Your pinboard is empty — create your first project!</p>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14,alignItems:'start'}}>
        {projects.map(p=><ProjectCard key={p.id} proj={p}
          onDelete={()=>delProject(p.id)}
          onToggle={(tid)=>toggleTask(p.id,tid)}
          onDelTask={(tid)=>delTask(p.id,tid)}
          onTaskInput={(v)=>setTaskInput(p.id,v)}
          onAddTask={()=>addTask(p.id)}
          onRename={(n)=>renameProject(p.id,n)}
        />)}
      </div>
    </div>
  );
}

function ProjectCard({proj, onDelete, onToggle, onDelTask, onTaskInput, onAddTask, onRename}){
  const {color,tasks,name,newTask} = proj;
  const done = tasks.filter(t=>t.done).length;
  const total = tasks.length;
  const pct = total ? Math.round((done/total)*100) : 0;
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(name);
  const [hoveringDel, setHoveringDel] = useState(false);

  return (
    <div style={{background:color.card,border:`1px solid ${color.border}`,borderRadius:12,padding:'14px 14px 12px',display:'flex',flexDirection:'column',gap:10,position:'relative'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',gap:6}}>
        <span style={{width:9,height:9,borderRadius:'50%',background:color.dot,display:'inline-block',flexShrink:0,marginTop:4}}></span>
        <div style={{flex:1,minWidth:0}}>
          {editing ? (
            <input autoFocus value={editVal}
              onChange={e=>setEditVal(e.target.value)}
              onBlur={()=>{onRename(editVal);setEditing(false);}}
              onKeyDown={e=>{if(e.key==='Enter'){onRename(editVal);setEditing(false);}if(e.key==='Escape')setEditing(false);}}
              style={{width:'100%',fontSize:13,fontWeight:500,border:'none',borderBottom:`1px solid ${color.dot}`,background:'transparent',color:'var(--color-text-primary)',outline:'none',padding:'0 0 2px'}}/>
          ):(
            <span onDoubleClick={()=>{setEditing(true);setEditVal(name);}}
              style={{fontSize:13,fontWeight:500,color:'var(--color-text-primary)',display:'block',wordBreak:'break-word',cursor:'text',lineHeight:1.4}}>
              {name}
            </span>
          )}
          {total>0 && <span style={{fontSize:11,color:color.dot,marginTop:2,display:'block'}}>{done}/{total} done</span>}
        </div>
        <button onClick={onDelete}
          onMouseEnter={()=>setHoveringDel(true)} onMouseLeave={()=>setHoveringDel(false)}
          style={{background:'none',border:'none',cursor:'pointer',fontSize:14,lineHeight:1,color:hoveringDel?'#E24B4A':'var(--color-text-tertiary)',padding:2,flexShrink:0,marginTop:-2}}>×</button>
      </div>

      {/* Progress */}
      {total>0 && (
        <div style={{height:3,background:'rgba(0,0,0,0.08)',borderRadius:999,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:color.dot,borderRadius:999,transition:'width .3s'}}></div>
        </div>
      )}

      {/* Tasks */}
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {tasks.filter(t=>!t.done).map(t=>(
          <TaskItem key={t.id} task={t} color={color} onToggle={()=>onToggle(t.id)} onDel={()=>onDelTask(t.id)}/>
        ))}
        {tasks.filter(t=>t.done).map(t=>(
          <TaskItem key={t.id} task={t} color={color} onToggle={()=>onToggle(t.id)} onDel={()=>onDelTask(t.id)}/>
        ))}
      </div>

      {/* Add task */}
      <div style={{display:'flex',gap:6,marginTop:2}}>
        <input value={newTask||''} onChange={e=>onTaskInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&onAddTask()}
          placeholder="Add task…"
          style={{flex:1,padding:'5px 8px',border:`0.5px solid ${color.border}`,borderRadius:'var(--border-radius-md)',background:'rgba(255,255,255,0.6)',color:'var(--color-text-primary)',fontSize:12,outline:'none'}}/>
        <button onClick={onAddTask}
          style={{padding:'5px 10px',border:'none',borderRadius:'var(--border-radius-md)',background:color.dot,color:'#fff',fontSize:13,cursor:'pointer',lineHeight:1}}>+</button>
      </div>
    </div>
  );
}

function TaskItem({task, color, onToggle, onDel}){
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{display:'flex',alignItems:'center',gap:7,padding:'4px 2px',borderRadius:6}}>
      <div onClick={onToggle} style={{width:15,height:15,borderRadius:'50%',border:`1.5px solid ${task.done?color.check:'rgba(0,0,0,0.2)'}`,background:task.done?color.check:'transparent',flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {task.done && <span style={{color:'#fff',fontSize:9,lineHeight:1}}>✓</span>}
      </div>
      <span style={{flex:1,fontSize:12,color:task.done?'rgba(0,0,0,0.35)':'var(--color-text-primary)',textDecoration:task.done?'line-through':'none',lineHeight:1.4,wordBreak:'break-word'}}>{task.title}</span>
      {hover && <button onClick={onDel} style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:'rgba(0,0,0,0.3)',padding:0,lineHeight:1,flexShrink:0}}>×</button>}
    </div>
  );
}