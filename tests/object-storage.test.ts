import {inspect} from 'node:util';
import {createServer,Server} from 'node:http';
import {AddressInfo} from 'node:net';
import {S3Client} from '@aws-sdk/client-s3';
import {UserContext} from '../src/core/context';
import {ObjectKey,ObjectPutOptions,ObjectReadUrlOptions,ObjectReadUrl,ObjectMetadata,ObjectContent,ObjectStorageProvider,StorageInvocation,StorageError,ObjectStorageEvent,MAX_OBJECT_PUT_SIZE} from '../src/core/object-storage';
import {S3ObjectStorage} from '../src/object-storage/s3';

class Stub implements ObjectStorageProvider {
  size=3;error?:StorageError;seen?:StorageInvocation;closes=0;deletes=0;
  async put(i:StorageInvocation,key:ObjectKey,_:AsyncIterable<Uint8Array>,o:ObjectPutOptions):Promise<ObjectMetadata>{this.seen=i;return new ObjectMetadata(key,o.size);}
  async head(i:StorageInvocation):Promise<undefined>{this.seen=i;if(this.error)throw this.error;return undefined;}
  async get(_:StorageInvocation,key:ObjectKey):Promise<ObjectContent>{return new ObjectContent(new ObjectMetadata(key,this.size),(async function*(){yield new Uint8Array([1,2,3]);})(),async()=>{this.closes++;});}
  async delete():Promise<void>{this.deletes++;}
  async getReadUrl():Promise<ObjectReadUrl>{throw new StorageError('Unsupported');}
}
const key=new ObjectKey('PRIVATE-KEY-CANARY');
test('conditional deletion fails closed when a provider only offers blind deletion',async()=>{
  const provider=new Stub();
  const storage=new UserContext().withObjectStorage(provider)
    .withObjectStorageObserver(()=>{}).objectStorage('collect old Blob generation');
  await expect(storage.deleteIfVersion(key,'version-one')).rejects.toMatchObject({code:'Unsupported'});
  await expect(storage.deleteIfVersion(key,'*')).rejects.toMatchObject({code:'InvalidInput'});
  expect(provider.deletes).toBe(0);
});
test('object storage validates options and masks private representations',()=>{
  for(const value of ['', 'x'.repeat(1025),'bad\nkey','\ud800'])expect(()=>new ObjectKey(value)).toThrow(StorageError);
  expect(()=>new ObjectPutOptions(MAX_OBJECT_PUT_SIZE+1,'create_only')).toThrow('TooLarge');
  expect(()=>new ObjectPutOptions(0,'create_only','bad\r\nheader')).toThrow('InvalidInput');
  expect(()=>new ObjectPutOptions(0,'create_only',undefined,{'Bad Key':'value'})).toThrow('InvalidInput');
  for(const lifetime of [0,-1,0.5,604801])expect(()=>new ObjectReadUrlOptions(lifetime)).toThrow('InvalidInput');
  expect(()=>new ObjectReadUrlOptions(1,'attachment','bad\nname')).toThrow('InvalidInput');
  const metadata={tag:'PRIVATE-METADATA-CANARY'},options=new ObjectPutOptions(0,'create_only',undefined,metadata);metadata.tag='changed';expect(options.metadata.tag).toBe('PRIVATE-METADATA-CANARY');expect(Object.isFrozen(options.metadata)).toBe(true);
  for(const value of [key,options,new ObjectReadUrl('PRIVATE-URL-CANARY',new Date()),new ObjectMetadata(key,0,'PRIVATE-TYPE-CANARY')])expect(inspect(value)).not.toContain('CANARY');
});
test('object storage retains context and propagates denied/unavailable errors',async()=>{
  expect(()=>new UserContext().objectStorage('read')).toThrow('NotConfigured');const provider=new Stub(),context=new UserContext().withObjectStorage(provider);
  expect(()=>context.objectStorage(' ')).toThrow('InvalidInput');const storage=context.objectStorage('read attachment');expect(await storage.exists(key)).toBe(false);expect(provider.seen?.context).toBe(context);expect(provider.seen?.comment).toBe('read attachment');
  for(const code of ['AccessDenied','Unavailable'] as const){provider.error=new StorageError(code);await expect(storage.exists(key)).rejects.toMatchObject({code});}
});
test('object storage stream ownership, limits, completion and observer safety',async()=>{
  const provider=new Stub(),events:ObjectStorageEvent[]=[],context=new UserContext().withObjectStorage(provider).withObjectStorageObserver(event=>events.push(event));const storage=context.objectStorage('read attachment');
  let closes=0;const input={ [Symbol.asyncIterator](){return {next:async()=>({done:false as const,value:new Uint8Array()}),return:async()=>{closes++;return {done:true as const,value:undefined};}};}};
  await storage.put(key,input,new ObjectPutOptions(0,'create_only'));expect(closes).toBe(1);
  const content=await storage.get(key);for await(const _ of content.stream)break;expect(events[events.length-1]?.outcome).toBe('cancelled');expect(provider.closes).toBe(1);
  expect(await storage.getBytes(key,3)).toEqual(new Uint8Array([1,2,3]));expect(events[events.length-1]?.outcome).toBe('success');
  await expect(storage.getBytes(key,2)).rejects.toMatchObject({code:'TooLarge'});
  for(const size of [2,4]){provider.size=size;await expect(storage.getBytes(key,5)).rejects.toMatchObject({code:'Io'});}
  expect(inspect(events)).not.toContain('CANARY');context.withObjectStorageObserver(()=>{throw new Error('observer failure');});expect(await storage.exists(key)).toBe(false);
});
test('S3 actual HTTP errors, malformed success and invalid streams do not become absence',async()=>{
  let status=403,calls=0;const server=createServer((request,response)=>{calls++;response.statusCode=request.url?.replace(/\/$/,'')==='/bucket'&&status===404?200:status;response.end();});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const endpoint=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const provider=new S3ObjectStorage(new S3Client({endpoint,region:'us-east-1',forcePathStyle:true,maxAttempts:1,credentials:{accessKeyId:'test',secretAccessKey:'secret'}}),'bucket');
  const storage=new UserContext().withObjectStorage(provider).withObjectStorageObserver(()=>{}).objectStorage('verify HTTP failures');
  try{
    for(const [code,expected] of [[403,'AccessDenied'],[500,'Unavailable'],[503,'Unavailable'],[408,'Timeout'],[504,'Timeout'],[501,'Unsupported']] as const){status=code;const error=await storage.exists(key).catch(error=>error);expect(error).toBeInstanceOf(StorageError);expect(error.code).toBe(expected);expect(error.cause).toBeUndefined();expect(error.message).not.toContain('CANARY');}
    status=404;expect(await storage.exists(key)).toBe(false);status=200;await expect(storage.exists(key)).rejects.toMatchObject({code:'Unavailable'});
    const before=calls;for(const [content,size] of [[new Uint8Array([1,2]),1],[new Uint8Array([1]),2]] as const)await expect(storage.putBytes(key,content,new ObjectPutOptions(size,'create_only'))).rejects.toMatchObject({code:'InvalidInput'});
    await expect(storage.put(key,(async function*(){throw new Error('PRIVATE-INPUT-CANARY');yield new Uint8Array();})(),new ObjectPutOptions(1,'create_only'))).rejects.toMatchObject({code:'Io'});
    expect(calls).toBe(before);await new Promise<void>(resolve=>server.close(()=>resolve()));await expect(storage.exists(key)).rejects.toMatchObject({code:'Unavailable'});
  }finally{server.close();provider.close();}
});
