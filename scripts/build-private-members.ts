import ts from 'typescript';
import {resolve} from 'node:path';
import type {Plugin} from 'vite';

// TypeScript's symbol table distinguishes a private field from an unrelated
// public property with the same spelling. Only these proven private symbols
// receive the production-only prefix consumed by Terser's property mangler.
// Authoring, dev tools, save keys and public/network interfaces retain names.
export function compactPrivateMembers(root:string):Plugin{
 let program:ts.Program,checker:ts.TypeChecker;
 const names=new Map<ts.Symbol,string>();
 const engineFiles:Record<string,string>={Screen:'engine/screen.ts',Input:'engine/input.ts',SceneStack:'engine/scene.ts',AudioEngine:'engine/audio.ts',Menu:'ui/widgets.ts',MessageBox:'ui/widgets.ts',Haptics:'engine/haptics.ts',Composer:'ui/composer.ts',SupplyView:'ui/SupplyView.ts'};
 return{
  name:'compact-private-members',apply:'build',enforce:'pre',
  buildStart(){
   const config=ts.readConfigFile(resolve(root,'tsconfig.json'),ts.sys.readFile);
   if(config.error)throw Error(ts.flattenDiagnosticMessageText(config.error.messageText,'\n'));
   const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,root);
   program=ts.createProgram(parsed.fileNames,parsed.options);checker=program.getTypeChecker();
   names.clear();
   for(const file of program.getSourceFiles().filter(f=>f.fileName.startsWith(resolve(root,'src')+'/')).sort((a,b)=>a.fileName<b.fileName?-1:a.fileName>b.fileName?1:0)){
    const visit=(node:ts.Node):void=>{
     if(ts.isClassDeclaration(node)||ts.isClassExpression(node)){
      const type=checker.getTypeAtLocation(node);
      // These application-internal engine/UI classes cross bundle boundaries.
      // Their public members receive fixed short names, never independent
      // per-chunk property mangling. Scene contracts and save/network shapes
      // are excluded; browser APIs and foreign same-name properties retain keys.
      let engineIndex=0;
      const engine=node.name&&engineFiles[node.name.text]&&file.fileName===resolve(root,'src',engineFiles[node.name.text]);
      for(const member of node.members){
       const candidates:ts.Node[]=ts.isConstructorDeclaration(member)?[...member.parameters]:[member];
       for(const candidate of candidates){
        const privateMember=ts.canHaveModifiers(candidate)&&ts.getModifiers(candidate)?.some(m=>m.kind===ts.SyntaxKind.PrivateKeyword);
        if(!privateMember&&!engine)continue;
        if(ts.isConstructorDeclaration(candidate))continue;
        if(ts.isParameter(candidate)&&!privateMember&&!ts.getModifiers(candidate)?.some(m=>[ts.SyntaxKind.PublicKeyword,ts.SyntaxKind.ProtectedKeyword,ts.SyntaxKind.ReadonlyKeyword].includes(m.kind)))continue;
        const name=(candidate as ts.NamedDeclaration).name;
        if(!name||!ts.isIdentifier(name))continue;
        const symbol=checker.getSymbolAtLocation(name),property=checker.getPropertyOfType(type,name.text);
        if((symbol&&names.has(symbol))||(property&&names.has(property)))continue;
        const alias=privateMember?`__pmPrivate_${names.size}`:`$${(engineIndex++).toString(36)}`;
        if(symbol)names.set(symbol,alias);if(property)names.set(property,alias);
        // A constructor parameter property has two symbols: the instance
        // field and the local parameter used in the constructor body.
        if(ts.isParameter(candidate)&&ts.isConstructorDeclaration(member)&&member.body){
         const bind=(node:ts.Node):void=>{
          if(ts.isIdentifier(node)||ts.isShorthandPropertyAssignment(node)){
           const local=ts.isShorthandPropertyAssignment(node)?checker.getShorthandAssignmentValueSymbol(node):checker.getSymbolAtLocation(node);
           if(local?.declarations?.includes(candidate))names.set(local,alias);
          }
          ts.forEachChild(node,bind);
         };bind(member);
        }
       }
      }
     }
     ts.forEachChild(node,visit);
    };visit(file);
   }
  },
  transform(_code,id){
   const file=program.getSourceFile(id);if(!file||!id.startsWith(resolve(root,'src')+'/')||!id.endsWith('.ts'))return;
   const transformer:ts.TransformerFactory<ts.SourceFile>=context=>source=>{
    const visit:ts.Visitor=node=>{
     if(ts.isShorthandPropertyAssignment(node)){
      const symbol=checker.getShorthandAssignmentValueSymbol(node),alias=symbol&&names.get(symbol);
      if(alias)return ts.factory.createPropertyAssignment(node.name,ts.factory.createIdentifier(alias));
     }
     if(ts.isIdentifier(node)){
      const symbol=checker.getSymbolAtLocation(node),alias=symbol&&names.get(symbol);
      if(alias)return ts.factory.createIdentifier(alias);
     }
     if(ts.isElementAccessExpression(node)&&node.argumentExpression&&ts.isStringLiteral(node.argumentExpression)){
      const property=checker.getPropertyOfType(checker.getTypeAtLocation(node.expression),node.argumentExpression.text),alias=property&&names.get(property);
      if(alias)return ts.factory.updateElementAccessExpression(node,ts.visitNode(node.expression,visit) as ts.Expression,ts.factory.createStringLiteral(alias));
     }
     return ts.visitEachChild(node,visit,context);
    };return ts.visitNode(source,visit) as ts.SourceFile;
   };
   const result=ts.transform(file,[transformer]);
   try{return{code:ts.createPrinter().printFile(result.transformed[0]),map:null};}finally{result.dispose();}
  }
 };
}
