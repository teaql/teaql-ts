import type { UserContext } from './context';
import { RuntimeTelemetry, startRuntimeOperation } from './telemetry';

export type StorageErrorCode = 'InvalidInput' | 'NotConfigured' | 'NotFound' | 'AccessDenied' | 'Conflict' | 'Timeout' | 'Unavailable' | 'Unsupported' | 'TooLarge' | 'Io';
export class StorageError extends Error {
  constructor(public readonly code: StorageErrorCode) { super(`Object storage: ${code}`); this.name = 'StorageError'; }
}
const inspect = Symbol.for('nodejs.util.inspect.custom');
export const MAX_OBJECT_PUT_SIZE = 5 * 1024 ** 3;
const invalid = (): never => { throw new StorageError('InvalidInput'); };
function header(value: string): string { if (typeof value !== 'string' || !value || /[^\x20-\x7e]/.test(value)) invalid(); return value; }
export class ObjectKey {
  #value: string;
  constructor(value: string) {
    if (typeof value !== 'string' || !value || new TextEncoder().encode(value).length > 1024 || /[\x00-\x1f\x7f-\x9f]/.test(value)) invalid();
    // Reject isolated UTF-16 surrogates; TextEncoder would otherwise replace them.
    for (let i=0;i<value.length;i++) { const c=value.charCodeAt(i); if(c>=0xd800&&c<=0xdbff){const n=value.charCodeAt(++i);if(!(n>=0xdc00&&n<=0xdfff))invalid();} else if(c>=0xdc00&&c<=0xdfff)invalid(); }
    this.#value = value;
  }
  get value(): string { return this.#value; }
  toString(): string { return 'ObjectKey[masked]'; }
  [inspect](): string { return this.toString(); }
}
export type ObjectWriteMode = 'create_only' | 'replace';
export class ObjectPutOptions {
  #size: number; #mode: ObjectWriteMode; #contentType: string; #metadata: Readonly<Record<string,string>>;
  constructor(size: number, mode: ObjectWriteMode, contentType='application/octet-stream', metadata: Record<string,string>={}) {
    if (!Number.isSafeInteger(size) || size<0 || !['create_only','replace'].includes(mode)) invalid();
    if(size>MAX_OBJECT_PUT_SIZE)throw new StorageError('TooLarge');
    header(contentType);
    for(const [key,value] of Object.entries(metadata)){if(!/^[a-z0-9][a-z0-9-]*$/.test(key))invalid();header(value);}
    this.#size=size;this.#mode=mode;this.#contentType=contentType;this.#metadata=Object.freeze({...metadata});
  }
  get size(): number{return this.#size;}
  get mode(): ObjectWriteMode{return this.#mode;}
  get contentType(): string{return this.#contentType;}
  get metadata(): Readonly<Record<string,string>>{return this.#metadata;}
  toString(): string{return `ObjectPutOptions[size=${this.size}, mode=${this.mode}, metadata=masked]`;}
  [inspect](): string{return this.toString();}
}
export class ObjectMetadata {
  #key: ObjectKey;#size:number;#contentType?:string;#etag?:string;#lastModified?:Date;#metadata:Readonly<Record<string,string>>;
  constructor(key:ObjectKey,size:number,contentType?:string,etag?:string,lastModified?:Date,metadata:Record<string,string>={}){
    if(!Number.isSafeInteger(size)||size<0)throw new StorageError('Unavailable');
    this.#key=key;this.#size=size;this.#contentType=contentType;this.#etag=etag;this.#lastModified=lastModified&&new Date(lastModified);this.#metadata=Object.freeze({...metadata});
  }
  get key():ObjectKey{return this.#key;}get size():number{return this.#size;}get contentType():string|undefined{return this.#contentType;}
  get etag():string|undefined{return this.#etag;}get lastModified():Date|undefined{return this.#lastModified&&new Date(this.#lastModified);}
  get customMetadata():Readonly<Record<string,string>>{return this.#metadata;}
  toString():string{return `ObjectMetadata[size=${this.size}, details=masked]`;}[inspect]():string{return this.toString();}
}
export class ObjectReadUrlOptions {
  #seconds:number;#disposition?:string;
  constructor(seconds=300,disposition?:'inline'|'attachment',filename?:string){
    if(!Number.isInteger(seconds)||seconds<=0||seconds>604800||disposition!==undefined&&!['inline','attachment'].includes(disposition))invalid();
    if(filename!==undefined){
      if(typeof filename!=='string'||!filename||!disposition||/[\x00-\x1f\x7f-\x9f\/\\"]/.test(filename)||
         new TextEncoder().encode(filename).length>1024)invalid();
      for(let i=0;i<filename.length;i++){
        const c=filename.charCodeAt(i);
        if(c>=0xd800&&c<=0xdbff){const n=filename.charCodeAt(++i);if(!(n>=0xdc00&&n<=0xdfff))invalid();}
        else if(c>=0xdc00&&c<=0xdfff)invalid();
      }
    }
    this.#seconds=seconds;
    this.#disposition=disposition+(filename===undefined?'':
      [...filename].every(c=>c.charCodeAt(0)<=126)?`; filename="${filename}"`:
      `; filename="${[...filename].map(c=>c.codePointAt(0)!<=126?c:'_').join('')}"; filename*=UTF-8''${
        [...new TextEncoder().encode(filename)].map(b=>
          b>=65&&b<=90||b>=97&&b<=122||b>=48&&b<=57||[45,46,95,126].includes(b)?
            String.fromCharCode(b):`%${b.toString(16).toUpperCase().padStart(2,'0')}`).join('')}`);
    if(disposition===undefined)this.#disposition=undefined;
  }
  get seconds():number{return this.#seconds;}get contentDisposition():string|undefined{return this.#disposition;}
  toString():string{return 'ObjectReadUrlOptions[details=masked]';}[inspect]():string{return this.toString();}
}
export class ObjectReadUrl {
  #url:string;#expiresAt:Date;
  constructor(url:string,expiresAt:Date){this.#url=url;this.#expiresAt=new Date(expiresAt);}
  get url():string{return this.#url;}get expiresAt():Date{return new Date(this.#expiresAt);}
  toString():string{return 'ObjectReadUrl[url=masked]';}[inspect]():string{return this.toString();}
}
export type ObjectByteStream = AsyncIterable<Uint8Array>;
export type StorageInvocation = Readonly<{context:UserContext;comment:string}>;
export type ObjectConditionalDeleteResult = 'deleted' | 'already_missing' | 'version_mismatch';
export interface ObjectStorageProvider {
  put(invocation:StorageInvocation,key:ObjectKey,content:ObjectByteStream,options:ObjectPutOptions):Promise<ObjectMetadata>;
  get(invocation:StorageInvocation,key:ObjectKey):Promise<ObjectContent>;
  head(invocation:StorageInvocation,key:ObjectKey):Promise<ObjectMetadata|undefined>;
  delete(invocation:StorageInvocation,key:ObjectKey):Promise<void>;
  deleteIfVersion?(invocation:StorageInvocation,key:ObjectKey,
    contentVersion:string):Promise<ObjectConditionalDeleteResult>;
  getReadUrl(invocation:StorageInvocation,key:ObjectKey,options:ObjectReadUrlOptions):Promise<ObjectReadUrl>;
}
export type ObjectStorageEvent = Readonly<{operation:string;comment:string;traceId:string;outcome:string;elapsedMs:number}>;
export type ObjectStorageObserver = (event:ObjectStorageEvent)=>void;
function sanitized(error:unknown):StorageError{return error instanceof StorageError?error:new StorageError('Unavailable');}
const safe=(text:unknown):string=>String(text??'').replace(/[\x00-\x1f\x7f-\x9f]/g,' ');
class Receipt {
  #ended=false;#started=performance.now();readonly scope;
  constructor(private invocation:StorageInvocation,private operation:string){this.scope=startRuntimeOperation(invocation.context.getResource<RuntimeTelemetry>('runtimeTelemetry'),{family:'object_storage',name:operation});}
  finish(outcome:string):void{
    if(this.#ended)return;this.#ended=true;
    if(outcome==='success')this.scope.success();else this.scope.failure(new StorageError(outcome==='cancelled'?'Io':outcome as StorageErrorCode));
    const event=Object.freeze({operation:this.operation,comment:safe(this.invocation.comment),traceId:safe(this.invocation.context.getResource('traceId')),outcome,elapsedMs:performance.now()-this.#started});
    try{const observer=this.invocation.context.getResource<ObjectStorageObserver>('objectStorageObserver');if(observer)observer(event);else console.info(`ObjectStorage operation=${event.operation} comment=${event.comment} trace=${event.traceId} outcome=${event.outcome} elapsedMs=${event.elapsedMs.toFixed(3)}`);}catch{/* fail open */}
  }
}
export class ObjectContent {
  #metadata:ObjectMetadata;#stream:ObjectByteStream;#close:()=>Promise<void>;
  constructor(metadata:ObjectMetadata,stream:ObjectByteStream,close:()=>Promise<void>){this.#metadata=metadata;this.#stream=stream;this.#close=close;}
  get metadata():ObjectMetadata{return this.#metadata;}get stream():ObjectByteStream{return this.#stream;}
  close():Promise<void>{return this.#close();}
  toString():string{return 'ObjectContent[masked]';}[inspect]():string{return this.toString();}
}
export class ObjectStorage {
  #invocation:StorageInvocation;#provider:ObjectStorageProvider;
  constructor(context:UserContext,comment:string){
    if(typeof comment!=='string'||!comment.trim())invalid();const provider=context.getResource<ObjectStorageProvider>('objectStorageProvider');if(!provider)throw new StorageError('NotConfigured');
    this.#invocation=Object.freeze({context,comment});this.#provider=provider;
  }
  async #call<T>(operation:string,work:()=>Promise<T>):Promise<T>{const receipt=new Receipt(this.#invocation,operation);try{const result=await (receipt.scope.run?receipt.scope.run(work):work());receipt.finish('success');return result;}catch(error){const safeError=sanitized(error);receipt.finish(safeError.code);throw safeError;}}
  async put(key:ObjectKey,content:ObjectByteStream,options:ObjectPutOptions):Promise<ObjectMetadata>{
    const iterator=content[Symbol.asyncIterator]();let done=false;
    const owned:AsyncIterableIterator<Uint8Array>={next:async()=>{const result=await iterator.next();if(result.done)done=true;return result;},return:async()=>{if(!done){done=true;await iterator.return?.();}return {done:true,value:undefined};},[Symbol.asyncIterator](){return this;}};
    return this.#call('put',async()=>{try{return await this.#provider.put(this.#invocation,key,owned,options);}finally{await owned.return!();}});
  }
  async putBytes(key:ObjectKey,bytes:Uint8Array,options:ObjectPutOptions):Promise<ObjectMetadata>{return this.put(key,(async function*(){yield bytes;})(),options);}
  async get(key:ObjectKey):Promise<ObjectContent>{
    const receipt=new Receipt(this.#invocation,'get');let response:ObjectContent;
    try{response=await (receipt.scope.run?receipt.scope.run(()=>this.#provider.get(this.#invocation,key)):this.#provider.get(this.#invocation,key));}catch(error){const safeError=sanitized(error);receipt.finish(safeError.code);throw safeError;}
    let closed=false,started=false;
    const close=async():Promise<void>=>{if(closed)return;closed=true;try{await response.close();receipt.finish('cancelled');}catch{receipt.finish('Io');throw new StorageError('Io');}};
    const stream: ObjectByteStream = {[Symbol.asyncIterator]:async function*(){
      if(started||closed)throw new StorageError('Io');started=true;let remaining=response.metadata.size;
      try{for await(const bytes of response.stream){if(!(bytes instanceof Uint8Array)||bytes.byteLength>remaining)throw new StorageError('Io');remaining-=bytes.byteLength;yield bytes;}if(remaining!==0)throw new StorageError('Io');receipt.finish('success');}
      catch{receipt.finish('Io');throw new StorageError('Io');}finally{await close();}
    }};
    return new ObjectContent(response.metadata,stream,close);
  }
  async getBytes(key:ObjectKey,maximumBytes:number):Promise<Uint8Array>{
    if(!Number.isSafeInteger(maximumBytes)||maximumBytes<0)invalid();const response=await this.get(key);
    try{if(response.metadata.size>maximumBytes)throw new StorageError('TooLarge');const chunks:Uint8Array[]=[];let size=0;for await(const block of response.stream){if(block.byteLength>maximumBytes-size)throw new StorageError('TooLarge');size+=block.byteLength;chunks.push(block);}const result=new Uint8Array(size);let offset=0;for(const block of chunks){result.set(block,offset);offset+=block.byteLength;}return result;}finally{await response.close();}
  }
  head(key:ObjectKey):Promise<ObjectMetadata|undefined>{return this.#call('head',()=>this.#provider.head(this.#invocation,key));}
  async exists(key:ObjectKey):Promise<boolean>{return (await this.head(key))!==undefined;}
  delete(key:ObjectKey):Promise<void>{return this.#call('delete',()=>this.#provider.delete(this.#invocation,key));}
  supportsVersionConditionalDelete():boolean{return typeof this.#provider.deleteIfVersion==='function';}
  async deleteIfVersion(key:ObjectKey,contentVersion:string):Promise<ObjectConditionalDeleteResult>{
    if(typeof contentVersion!=='string'||!contentVersion||
       contentVersion.length>256||contentVersion.trim()!==contentVersion||
       /[\x00-\x1f\x7f-\x9f]/.test(contentVersion)||contentVersion==='*')invalid();
    const deleteIfVersion=this.#provider.deleteIfVersion;
    if(!deleteIfVersion)throw new StorageError('Unsupported');
    return this.#call('delete_if_version',async()=>{
      const result=await deleteIfVersion.call(this.#provider,this.#invocation,key,contentVersion);
      if(result!=='deleted'&&result!=='already_missing'&&result!=='version_mismatch')
        throw new StorageError('Unavailable');
      return result;
    });
  }
  getReadUrl(key:ObjectKey,options=new ObjectReadUrlOptions()):Promise<ObjectReadUrl>{return this.#call('read_url',()=>this.#provider.getReadUrl(this.#invocation,key,options));}
}
