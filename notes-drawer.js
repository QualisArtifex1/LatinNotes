export function NotesDrawer({React,translation,notes,onTranslation,onNotes}) {
 const [active,setActive]=React.useState(null);const h=React.createElement;
 return h('section',{className:'notes-drawer','aria-label':'Translation and notes'},
 h('div',{className:'drawer-tabs'},...['Translation','Scholarly Notes'].map((name,i)=>h('button',{key:name,type:'button','aria-expanded':active===i,'aria-controls':'drawer-content',onClick:()=>setActive(active===i?null:i)},`${active===i?'▾':'▸'} ${name}${(i?notes:translation)?' •':''}`))),
 active!==null&&h('div',{id:'drawer-content',className:'drawer-content'},h('textarea',{'aria-label':active===0?'Translation':'Scholarly Notes',value:active===0?translation:notes,onChange:e=>(active===0?onTranslation:onNotes)(e.target.value),placeholder:active===0?'A faithful rendering of the Latin text…':'Grammatical, historical, or literary commentary…'})));
}
