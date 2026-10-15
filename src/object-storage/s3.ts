/** Server-only adapter. SDK types and filesystem dependencies stay outside core. */
import {S3Client,PutObjectCommand,GetObjectCommand,HeadObjectCommand,HeadBucketCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {mkdtemp,open,rm} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {ObjectStorageProvider,StorageInvocation,ObjectKey,ObjectByteStream,ObjectPutOptions,ObjectMetadata,ObjectContent,ObjectReadUrlOptions,ObjectReadUrl,StorageError} from '../core/object-storage';

function translate(error:unknown):StorageError{
  if(error instanceof StorageError)return error;
  const e=error as {name?:string;$metadata?:{httpStatusCode?:number}};
  if(e.name==='NoSuchBucket')return new StorageError('Unavailable');
  if(e.name==='TimeoutError'||e.name==='RequestTimeout')return new StorageError('Timeout');
  switch(e.$metadata?.httpStatusCode){case 401:case 403:return new StorageError('AccessDenied');case 404:return new StorageError('NotFound');case 409:case 412:return new StorageError('Conflict');case 408:case 504:return new StorageError('Timeout');case 413:return new StorageError('TooLarge');case 501:return new StorageError('Unsupported');case 400:case 422:return new StorageError('InvalidInput');default:return new StorageError('Unavailable');}
}
function metadata(key:ObjectKey,result:{ContentLength?:number;ContentType?:string;ETag?:string;LastModified?:Date;Metadata?:Record<string,string>}):ObjectMetadata{
  if(!Number.isSafeInteger(result.ContentLength)||!result.ETag?.trim())throw new StorageError('Unavailable');
  return new ObjectMetadata(key,result.ContentLength!,result.ContentType,result.ETag,result.LastModified,result.Metadata);
}
export class S3ObjectStorage implements ObjectStorageProvider {
  #client:S3Client;#bucket:string;
  constructor(client:S3Client,bucket:string){if(!bucket.trim())throw new StorageError('InvalidInput');this.#client=client;this.#bucket=bucket;}
  async put(_:StorageInvocation,key:ObjectKey,content:ObjectByteStream,options:ObjectPutOptions):Promise<ObjectMetadata>{
    let directory:string;
    try{directory=await mkdtemp(join(tmpdir(),'teaql-object-'));}catch{throw new StorageError('Io');}
    try{
      const file=join(directory,'upload');const handle=await open(file,'wx',0o600);let size=0;
      try{for await(const chunk of content){if(!(chunk instanceof Uint8Array))throw new StorageError('InvalidInput');size+=chunk.byteLength;if(size>options.size)throw new StorageError('InvalidInput');let offset=0;while(offset<chunk.byteLength){const written=await handle.write(chunk,offset,chunk.byteLength-offset);if(!written.bytesWritten)throw new StorageError('Io');offset+=written.bytesWritten;}}}catch(error){throw error instanceof StorageError?error:new StorageError('Io');}finally{await handle.close();}
      if(size!==options.size)throw new StorageError('InvalidInput');
      // Node SDK bodies are streams. Reopen the staged file for bounded retries.
      for(let attempt=0;attempt<3;attempt++){
        const body=createReadStream(file);
        try{const result=await this.#client.send(new PutObjectCommand({Bucket:this.#bucket,Key:key.value,Body:body,ContentLength:size,ContentType:options.contentType,Metadata:{...options.metadata},IfNoneMatch:options.mode==='create_only'?'*':undefined}));if(!result.ETag?.trim())throw new StorageError('Unavailable');return new ObjectMetadata(key,size,options.contentType,result.ETag,undefined,{...options.metadata});}
        catch(error){const safeError=translate(error);if(attempt===2||!['Timeout','Unavailable'].includes(safeError.code)||error instanceof StorageError)throw safeError;await new Promise(resolve=>setTimeout(resolve,50*(attempt+1)));}
        finally{body.destroy();}
      }
      throw new StorageError('Unavailable');
    }catch(error){throw error instanceof StorageError?error:new StorageError('Io');}
    finally{try{await rm(directory,{recursive:true,force:true});}catch{throw new StorageError('Io');}}
  }
  async get(_:StorageInvocation,key:ObjectKey):Promise<ObjectContent>{
    let result;
    try{result=await this.#client.send(new GetObjectCommand({Bucket:this.#bucket,Key:key.value}));}catch(error){throw translate(error);}
    const body=result.Body as Readable|undefined;
    try{if(!body||!body[Symbol.asyncIterator])throw new StorageError('Unavailable');return new ObjectContent(metadata(key,result),body as unknown as ObjectByteStream,async()=>{body.destroy();});}
    catch(error){body?.destroy();throw translate(error);}
  }
  async head(_:StorageInvocation,key:ObjectKey):Promise<ObjectMetadata|undefined>{
    try{return metadata(key,await this.#client.send(new HeadObjectCommand({Bucket:this.#bucket,Key:key.value})));}
    catch(error){const safeError=translate(error);if(safeError.code!=='NotFound')throw safeError;}
    try{await this.#client.send(new HeadBucketCommand({Bucket:this.#bucket}));return undefined;}
    catch(error){const safeError=translate(error);throw safeError.code==='NotFound'?new StorageError('Unavailable'):safeError;}
  }
  async delete(_:StorageInvocation,key:ObjectKey):Promise<void>{try{await this.#client.send(new DeleteObjectCommand({Bucket:this.#bucket,Key:key.value}));}catch(error){throw translate(error);}}
  async getReadUrl(_:StorageInvocation,key:ObjectKey,options:ObjectReadUrlOptions):Promise<ObjectReadUrl>{
    const date=new Date();
    try{const url=await getSignedUrl(this.#client,new GetObjectCommand({Bucket:this.#bucket,Key:key.value,ResponseContentDisposition:options.contentDisposition}),{expiresIn:options.seconds,signingDate:date});
      const headers=new URL(url).searchParams.get('X-Amz-SignedHeaders');if(headers&&headers.toLowerCase()!=='host')throw new StorageError('Unsupported');
      return new ObjectReadUrl(url,new Date(date.getTime()+options.seconds*1000));
    }catch(error){throw translate(error);}
  }
  close():void{this.#client.destroy();}
  toString():string{return 'S3ObjectStorage[configuration=masked]';}
  [Symbol.for('nodejs.util.inspect.custom')]():string{return this.toString();}
}
