import { useEffect, useState } from 'react'
type NodeT = { id:string; title:string; type:string; text:string[] }
type EdgeT = { from:string; to:string; label:string }
type GraphT = { nodes: NodeT[]; edges: EdgeT[] }
export default function App(){
  const [g,setG]=useState<GraphT|null>(null)
  const [curr,setCurr]=useState<string|undefined>(undefined)
  const [comment,setComment]=useState(localStorage.getItem('client_comment')??'')
  useEffect(()=>{(async()=>{
    const res=await fetch(import.meta.env.BASE_URL+'graph.json')
    const data:GraphT=await res.json()
    setG(data); setCurr(data.nodes[0]?.id)
  })()},[])
  useEffect(()=>{localStorage.setItem('client_comment',comment)},[comment])
  if(!g||!curr) return <div style={{padding:16}}>Завантаження…</div>
  const node=g.nodes.find(n=>n.id===curr)!
  const edges=g.edges.filter(e=>e.from===curr)
  return <div style={{display:'grid',gridTemplateRows:'auto auto 1fr',height:'100vh',color:'#fff',background:'#0b0f14'}}>
    <header style={{padding:8,borderBottom:'1px solid #243041',background:'#121821'}}>Sales Script — Graph</header>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',padding:8,borderBottom:'1px solid #243041',background:'#121821'}}>
      {edges.map((e,i)=>(<button key={i} onClick={()=>setCurr(e.to)} style={{background:'#1a2230',border:'1px solid #3b4c68',borderRadius:8,padding:'6px 10px'}}>{e.label}</button>))}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'280px 1fr 360px',gap:8,padding:8}}>
      <aside style={{overflow:'auto',borderRight:'1px solid #243041',paddingRight:8}}>
        {g.nodes.map(n=>(<div key={n.id}><button onClick={()=>setCurr(n.id)} style={{display:'block',width:'100%',textAlign:'left',background:n.id===curr?'#1a2230':'#0f1520',border:'1px solid #243041',borderRadius:8,padding:'6px 10px',marginBottom:6}}>
          <div>{n.title}</div><div style={{opacity:.6,fontSize:12}}>{n.type}</div></button></div>))}
      </aside>
      <main style={{overflow:'auto'}}>
        <div style={{opacity:.7,fontSize:12}}>{node.type}</div>
        <h1 style={{margin:'6px 0 12px'}}>{node.title}</h1>
        {(node.text??[]).filter(t=>(t??'').trim()!=='').map((t,i)=>(
          <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',background:'#0f1520',border:'1px solid #243041',borderRadius:10,padding:10,marginBottom:8}}>
            <div style={{opacity:.5,width:24,textAlign:'right'}}>{i+1}</div>
            <div style={{whiteSpace:'pre-wrap',lineHeight:1.5}}>{t}</div>
            <button onClick={()=>navigator.clipboard.writeText(t)} style={{marginLeft:'auto',background:'#1a2230',border:'1px solid #3b4c68',borderRadius:8,padding:'6px 10px'}}>Копіювати</button>
          </div>
        ))}
      </main>
      <aside style={{display:'flex',flexDirection:'column',borderLeft:'1px solid #243041',background:'#121821',padding:8}}>
        <div style={{marginBottom:6}}>Коментар про клієнта</div>
        <textarea value={comment} onChange={e=>setComment(e.target.value)} style={{flex:1,background:'#0f1520',border:'1px solid #243041',borderRadius:8,padding:8}} placeholder="Нотатки…"/>
        <div style={{opacity:.6,fontSize:12,marginTop:6}}>Зберігається локально</div>
      </aside>
    </div>
  </div>
}