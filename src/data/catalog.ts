// Identity and ordinary display names share one source; exceptions stay explicit.
export function namedCatalog<T extends { id:string }>(entries:Array<T & { name?:string }>):Record<string,T & {name:string}> {
 return Object.fromEntries(entries.map(entry=>[entry.id,{...entry,name:entry.name??entry.id.toUpperCase()}]));
}
