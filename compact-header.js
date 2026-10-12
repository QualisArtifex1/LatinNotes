import {EditorActions} from './editor-history.js';
export function CompactHeader({React,history,dark,onTheme}) {
  const h=React.createElement;
  return h('header',{className:'compact-header'},
    h('h1',null,'Qualis Artifex'),
    h(EditorActions,{React,history,compact:true}),
    h('div',{className:'compact-utilities'},
      h('details',{className:'compact-help'},
        h('summary',{'aria-label':'Help',title:'Help and keyboard shortcuts'},'?'),
        h('div',{className:'compact-help-panel'},
          h('strong',null,'Annotating Latin'),
          h('p',null,'Drag one word onto another to connect them. Select a word to highlight it or add a note.'),
          h('p',null,'Undo: Ctrl/Cmd + Z'),h('p',null,'Redo: Ctrl/Cmd + Shift + Z'),
          h('p',null,'Reading View: Option/Alt + Shift + R'),
          h('p',null,'Reading View hides annotations without deleting them. Save your session before reloading.')
        )),
      h('button',{type:'button',onClick:onTheme,title:dark?'Switch to Light Mode':'Switch to Dark Mode','aria-label':dark?'Switch to Light Mode':'Switch to Dark Mode'},dark?'☀':'☾')
    )
  );
}
