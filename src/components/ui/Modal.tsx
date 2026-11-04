import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
export function Modal({title,onClose,children,className='',kicker='槐树街小剧场'}:{title:string;onClose:()=>void;children:ReactNode;className?:string;kicker?:string}){
 const ref=useRef<HTMLDialogElement>(null);const closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{const dialog=ref.current!;dialog.showModal();return ()=>dialog.close();},[]);
 return <dialog ref={ref} className={`modal ${className}`} aria-label={title} onCancel={e=>{e.preventDefault();closeRef.current();}}><div className="modal-top"><span className="eyebrow">{kicker}</span><button className="icon-button" onClick={onClose} aria-label="关闭"><X size={20}/></button></div><h2>{title}</h2>{children}</dialog>;
}
