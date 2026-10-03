import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const focusTokens=[
 '►','drawChoicePreview','new Menu(','.menu.draw(','.composer.draw(',
 'const sel =','const selected =','if (sel)','if (selected)',
 // The dossier renderer highlights the current title and displays its page.
 'drawDossierPage('
];
export function inputContract(source){
 const keys=[...source.matchAll(/wasPressed\(\s*(['"])([a-z]+)\1\s*\)/g)].map(m=>m[2]);
 const directional=['up','down','left','right'].some(key=>keys.includes(key));
 const confirms=keys.includes('a'),menuDriven=source.includes('.update(this.input)')&&source.includes('new Menu(');
 if(!(directional&&confirms)&&!menuDriven)return null;
 // Native kit panels expose selection and a named back action instead of
 // drawing keyboard instructions into the pixel canvas. Keyboard bindings
 // remain in Menu.update and the common shell guide.
 if(source.includes('get uiPanel()')&&/\bselected\s*:/.test(source)&&/\bactions\s*:/.test(source)&&/\bback\s*:/.test(source))
   return {focus:true,aHint:true,bHint:true};
 // Starter dossiers have no choice list: the visible current tab and page
 // counter identify what left/right and up/down are changing. A renderer
 // alone is insufficient; both visible labels must accompany it.
 const pagedDossier=source.includes('drawEpiloguePage(')
  && /screen\.text\([\s\S]*?\]\[this\.tab\]/.test(source)
  && source.includes('${this.page+1}/${this.pages().length}');
 return {focus:pagedDossier||focusTokens.some(token=>source.includes(token)),aHint:/A[: /]|A SCEGLI|A OK|A CONFERMA|A\/B/.test(source),bHint:/B[: /]|B ESCI|B CHIUDI|B ANNULLA|B INDIETRO|A\/B/.test(source)};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','src/scenes/*.ts','src/game/battle/*.ts','src/ui/campaignChoices.ts'],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
 const results=files.flatMap(file=>{const result=inputContract(readFileSync(file,'utf8'));return result?[{file,...result}]:[];});
 const failures=results.filter(row=>!row.focus||!row.aHint||!row.bHint);
 console.log(`Input contracts: ${results.length} scene direzionali con conferma`);
 for(const row of results)console.log(`${row.focus&&row.aHint&&row.bHint?'OK':'FAIL'} ${row.file} focus=${row.focus} A=${row.aHint} B=${row.bHint}`);
 if(failures.length){console.error(`\n${failures.length} scene senza focus o contratto A/B visibile.`);process.exit(1);}
}
