import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { EditorContent, Extension, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { TableKit } from '@tiptap/extension-table';
import { Plugin } from '@tiptap/pm/state';
import { AppIcon } from '../ui/AppIcon';
import type { WritingFormat } from './procedure-formatting';
import { safeWritingLink } from './writing-links';
import '../styles/rich-experience-editor.css';

export type RichExperienceEditorHandle = { focus:()=>void };
const limit = Extension.create<{onLimit:()=>void}>({
  name:'experienceLength',
  addOptions(){return {onLimit:()=>{}};},
  addProseMirrorPlugins(){return [new Plugin({filterTransaction:transaction=>{
    if(!transaction.docChanged)return true;
    const next=this.editor.markdown?.serialize(transaction.doc.toJSON());
    if(next===undefined)return true;
    if(next.length<=20000)return true;
    const previous=this.editor.getMarkdown();
    if(next.length<previous.length)return true;
    queueMicrotask(()=>this.options.onLimit());
    return false;
  }})];},
});
const tools:{format:WritingFormat;label:string;basic?:boolean}[]=[
  {format:'bold',label:'Bold',basic:true},{format:'italic',label:'Italic',basic:true},
  {format:'heading',label:'Heading'},{format:'list',label:'List',basic:true},
  {format:'code',label:'Code'},{format:'quote',label:'Quote'},{format:'link',label:'Link'},
];
export const RichExperienceEditor=forwardRef<RichExperienceEditorHandle,{
  value:string; onChange:(value:string)=>void; onLimit:()=>void; disabled:boolean; invalid:boolean;
}>(({value,onChange,onLimit,disabled,invalid},ref)=>{
  const callbacks=useRef({onChange,onLimit});callbacks.current={onChange,onLimit};
  const lastApplied=useRef(value),editorRef=useRef<Editor|null>(null),dialog=useRef<HTMLDialogElement>(null);
  const [,render]=useState(0),[linkOpen,setLinkOpen]=useState(false),[url,setUrl]=useState(''),[linkError,setLinkError]=useState('');
  function openLink(){const current=editorRef.current;if(!current)return;setUrl(current.getAttributes('link').href||'');setLinkError('');setLinkOpen(true);}
  const editor=useEditor({
    immediatelyRender:false,
    extensions:[StarterKit.configure({underline:false,heading:{levels:[2,3]},link:{openOnClick:false,isAllowedUri:uri=>Boolean(safeWritingLink(uri))}}),TableKit.configure({table:{resizable:false}}),Markdown,limit.configure({onLimit:()=>callbacks.current.onLimit()})],
    content:value,contentType:'markdown',editable:!disabled,
    editorProps:{attributes:{id:'procedure-body',role:'textbox','aria-label':'Your experience','aria-multiline':'true','aria-required':'true',spellcheck:'true',autocapitalize:'sentences',class:'live-writing-canvas','aria-placeholder':'Share the rounds you attended, questions you remember, or what helped you prepare.'},handleKeyDown:(_view,event)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openLink();return true;}return false;}},
    onUpdate:({editor:current})=>{const markdown=current.getMarkdown();lastApplied.current=markdown;callbacks.current.onChange(markdown);},
    onTransaction:()=>render(revision=>revision+1),
  });
  editorRef.current=editor;
  useImperativeHandle(ref,()=>({focus:()=>{editor?.commands.focus();}}),[editor]);
  useEffect(()=>{if(editor&&value!==lastApplied.current){editor.commands.setContent(value,{contentType:'markdown',emitUpdate:false});lastApplied.current=value;}},[editor,value]);
  useEffect(()=>{editor?.setEditable(!disabled,false);},[editor,disabled]);
  useEffect(()=>{if(!editor)return;editor.setOptions({editorProps:{...editor.options.editorProps,attributes:{...editor.options.editorProps.attributes,'aria-readonly':String(disabled),'aria-invalid':String(invalid),'aria-describedby':invalid?'procedure-error-body':''}}});},[editor,invalid,disabled]);
  useEffect(()=>{if(linkOpen)dialog.current?.showModal();},[linkOpen]);
  function active(format:WritingFormat){return Boolean(editor?.isActive(format==='list'?'bulletList':format==='quote'?'blockquote':format==='heading'?'heading':format));}
  function format(action:WritingFormat){
    if(!editor||disabled)return;
    if(action==='link'){openLink();return;}
    const chain=editor.chain().focus();
    if(action==='bold')chain.toggleBold().run();
    if(action==='italic')chain.toggleItalic().run();
    if(action==='heading')chain.toggleHeading({level:2}).run();
    if(action==='list')chain.toggleBulletList().run();
    if(action==='code')chain.toggleCode().run();
    if(action==='quote')chain.toggleBlockquote().run();
  }
  function closeLink(){dialog.current?.close();setLinkOpen(false);editor?.commands.focus();}
  function applyLink(){
    if(!editor)return;
    if(!url.trim()){editor.chain().focus().extendMarkRange('link').unsetLink().run();closeLink();return;}
    const href=safeWritingLink(url);
    if(!href){setLinkError('Use a full https://, http:// or mailto: link.');return;}
    if(editor.state.selection.empty&&!editor.isActive('link'))editor.chain().focus().insertContent({type:'text',text:url.trim(),marks:[{type:'link',attrs:{href}}]}).run();
    else editor.chain().focus().extendMarkRange('link').setLink({href}).run();
    closeLink();
  }
  const button=(tool:typeof tools[number],more=false)=><button type="button" key={tool.format} aria-label={tool.label} aria-pressed={active(tool.format)} disabled={disabled||!editor} className={more?'':tool.basic?'editor-basic-tool':'editor-advanced-tool'} title={tool.label} onPointerDown={event=>event.preventDefault()} onClick={()=>format(tool.format)}><AppIcon name={tool.format}/><span>{tool.label}</span></button>;
  return <div className="live-experience-editor">
    <div className="procedure-toolbar" role="toolbar" aria-label="Writing tools">
      <button type="button" className="editor-history-tool" aria-label="Undo" title="Undo" disabled={disabled||!editor?.can().undo()} onPointerDown={event=>event.preventDefault()} onClick={()=>editor?.chain().focus().undo().run()}><span aria-hidden="true">↶</span></button>
      <button type="button" className="editor-history-tool" aria-label="Redo" title="Redo" disabled={disabled||!editor?.can().redo()} onPointerDown={event=>event.preventDefault()} onClick={()=>editor?.chain().focus().redo().run()}><span aria-hidden="true">↷</span></button>
      {tools.map(tool=>button(tool))}
      <details className="editor-more-tools"><summary>More</summary><div><div className="editor-history-menu"><button type="button" aria-label="Undo" disabled={disabled||!editor?.can().undo()} onPointerDown={event=>event.preventDefault()} onClick={()=>editor?.chain().focus().undo().run()}>Undo</button><button type="button" aria-label="Redo" disabled={disabled||!editor?.can().redo()} onPointerDown={event=>event.preventDefault()} onClick={()=>editor?.chain().focus().redo().run()}>Redo</button></div>{tools.filter(tool=>!tool.basic).map(tool=>button(tool,true))}</div></details>
    </div>
    <EditorContent editor={editor}/>
    {linkOpen&&<dialog ref={dialog} className="writing-link-dialog" aria-label="Insert link" onCancel={()=>setLinkOpen(false)}><form onSubmit={event=>{event.preventDefault();applyLink();}}><h2>Insert link</h2><label>Link address<input autoFocus type="text" inputMode="url" value={url} onChange={event=>setUrl(event.target.value)} placeholder="https://…"/></label>{linkError&&<p role="alert">{linkError}</p>}<div><button type="button" onClick={closeLink}>Cancel</button><button type="submit">{url.trim()?'Apply link':'Remove link'}</button></div></form></dialog>}
  </div>;
});
RichExperienceEditor.displayName='RichExperienceEditor';
