const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {S3Client,HeadBucketCommand,CreateBucketCommand}=require('@aws-sdk/client-s3');
const {UserContext,ObjectKey,ObjectPutOptions,ObjectReadUrlOptions,StorageError}=require('../../dist');
const {S3ObjectStorage}=require('../../dist/object-storage/s3');

async function expect(code,work){await assert.rejects(work,error=>error instanceof StorageError&&error.code===code);}
async function main(){
  const bucket=process.env.TEAQL_S3_BUCKET;
  const client=new S3Client({endpoint:process.env.TEAQL_S3_ENDPOINT,forcePathStyle:true,region:'us-east-1',maxAttempts:1,credentials:{accessKeyId:process.env.TEAQL_S3_ACCESS_KEY,secretAccessKey:process.env.TEAQL_S3_SECRET_KEY}});
  try{await client.send(new HeadBucketCommand({Bucket:bucket}));}catch(error){if(error.$metadata?.httpStatusCode!==404)throw new Error('test bucket setup failed');await client.send(new CreateBucketCommand({Bucket:bucket}));}
  const provider=new S3ObjectStorage(client,bucket),events=[];
  const context=new UserContext().insertResource('traceId','storage-example').withObjectStorage(provider).withObjectStorageObserver(event=>events.push(event));const storage=context.objectStorage('verify binary object storage');
  const prefix=`typescript-example/${crypto.randomUUID()}/`,key=new ObjectKey(prefix+'收据 +% binary'),empty=new ObjectKey(prefix+'empty'),race=new ObjectKey(prefix+'race');
  const data=Uint8Array.from({length:256*1024},(_,i)=>i%251);
  try{
    assert.equal(await storage.exists(key),false);await expect('NotFound',()=>storage.get(key));
    await storage.putBytes(key,data,new ObjectPutOptions(data.length,'create_only','application/octet-stream',{example:'binary'}));
    const metadata=await storage.head(key);assert.equal(metadata.size,data.length);assert.equal(metadata.customMetadata.example,'binary');assert(metadata.etag);
    assert.deepEqual(await storage.getBytes(key,data.length),data);await expect('Conflict',()=>storage.putBytes(key,new Uint8Array(),new ObjectPutOptions(0,'create_only')));await expect('TooLarge',()=>storage.getBytes(key,1));
    const url=await storage.getReadUrl(key,new ObjectReadUrlOptions(300,'attachment','receipt.bin'));const response=await fetch(url.url);assert.equal(response.status,200);assert.equal(response.headers.get('content-disposition'),'attachment; filename="receipt.bin"');assert.deepEqual(new Uint8Array(await response.arrayBuffer()),data);
    const expired=await storage.getReadUrl(key,new ObjectReadUrlOptions(1));await new Promise(resolve=>setTimeout(resolve,2200));const denied=await fetch(expired.url);assert.equal(denied.status,403);await denied.arrayBuffer();
    await storage.putBytes(empty,new Uint8Array(),new ObjectPutOptions(0,'create_only'));assert.equal((await storage.getBytes(empty,0)).length,0);
    await expect('InvalidInput',()=>storage.putBytes(key,new Uint8Array([1,2]),new ObjectPutOptions(1,'replace')));assert.deepEqual(await storage.getBytes(key,data.length),data);
    await storage.putBytes(key,new Uint8Array([1,2,3]),new ObjectPutOptions(3,'replace'));assert.deepEqual(await storage.getBytes(key,3),new Uint8Array([1,2,3]));
    const other=new UserContext().insertResource('traceId','storage-other').withObjectStorage(provider).withObjectStorageObserver(event=>events.push(event)).objectStorage('verify atomic create');
    const outcomes=await Promise.allSettled([storage,other].map(api=>api.putBytes(race,new Uint8Array([1]),new ObjectPutOptions(1,'create_only'))));assert.equal(outcomes.filter(outcome=>outcome.status==='fulfilled').length,1);assert.equal(outcomes.find(outcome=>outcome.status==='rejected').reason.code,'Conflict');
    const missing=new UserContext().withObjectStorage(new S3ObjectStorage(client,'missing-'+crypto.randomUUID())).objectStorage('verify missing bucket');await expect('Unavailable',()=>missing.exists(key));
    for(const item of [key,empty,race]){await storage.delete(item);await storage.delete(item);assert.equal(await storage.exists(item),false);}
    assert.deepEqual(new Set(events.map(e=>e.traceId)),new Set(['storage-example','storage-other']));assert(!JSON.stringify(events).includes(prefix));
    console.log('PASS TypeScript S3: binary, empty, metadata, URL download/expiry, atomic create, replace, bounded reads, missing bucket, repeated delete');
  }finally{for(const item of [key,empty,race])await storage.delete(item);provider.close();}
}
main().catch(error=>{console.error(error instanceof StorageError?error.message:'Object storage example failed');process.exitCode=1;});
