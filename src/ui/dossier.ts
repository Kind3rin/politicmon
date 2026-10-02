import type {Screen} from '../engine/screen';
import {wrapText} from './widgets';

export function dossierPages(paragraphs:readonly string[],maxLines=9):string[][]{
 const pages:string[][]=[[]];
 for(const paragraph of paragraphs){
  const lines=wrapText(paragraph.toUpperCase(),34);
  if(pages.at(-1)!.length&&pages.at(-1)!.length+lines.length>maxLines)pages.push([]);
  while(lines.length){
   const page=pages.at(-1)!;page.push(...lines.splice(0,maxLines-page.length));
   if(lines.length)pages.push([]);
  }
 }
 return pages;
}
export function drawDossierPage(screen:Screen,pages:readonly string[][],page:number,title:string,result:boolean,action:string,back:string,top=25):number{
 page=Math.min(page,pages.length-1);
 screen.panel(8,top,224,157-top,'card');screen.rect(14,top+5,212,14,result?'#55a889':'#f4d34a');
 screen.text(title,18,top+9,'#10141f');screen.textRight(`${page+1}/${pages.length}`,220,top+9,'#10141f');
 pages[page].forEach((line,i)=>screen.text(line,18,top+26+i*11,'#17243d'));
 screen.text(`${page<pages.length-1?'A AVANTI':action} · ${back} · ◄ ►`,8,167,'#ffe38a');
 return page;
}
