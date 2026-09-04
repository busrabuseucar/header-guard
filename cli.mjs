import {open,lstat} from 'node:fs/promises';
import {analyze,exportReport,InputError,LIMITS} from './dist/engine.js';
import {BEFORE,AFTER} from './dist/samples.js';
const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--help'){
 console.log('HeaderGuard: node cli.mjs --demo | --demo-fixed | [--scheme https|http|unknown] file.txt\nExit: 0 all limited checks pass, 1 review/missing, 2 input error. No HTTP requests are made.');process.exit(0);
}
try{
 let input,scheme='unknown';
 if(args.length===1&&['--demo','--demo-fixed'].includes(args[0])){input=args[0]==='--demo'?BEFORE:AFTER;scheme='https';}
 else{
   if(args[0]==='--scheme'){scheme=args[1];args.splice(0,2);}
   if(!['https','http','unknown'].includes(scheme)||args.length!==1||args[0].startsWith('--'))throw new InputError('Kullanım: node cli.mjs [--scheme https|http|unknown] file.txt');
   const info=await lstat(args[0]);if(!info.isFile())throw new InputError('Yalnızca normal metin dosyaları destekleniyor.');
   if(info.size>LIMITS.bytes)throw new InputError('Dosya 64 KiB sınırını aşıyor.');
   const handle=await open(args[0],'r');
   try{
     if(!(await handle.stat()).isFile())throw new InputError('Normal dosya bekleniyor.');
     const buffer=Buffer.alloc(LIMITS.bytes+1);let size=0;
     while(size<buffer.length){const {bytesRead}=await handle.read(buffer,size,buffer.length-size,null);if(!bytesRead)break;size+=bytesRead;}
     if(size>LIMITS.bytes)throw new InputError('Dosya 64 KiB sınırını aşıyor.');
     try{input=new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(0,size));}catch{throw new InputError('Dosya UTF-8 metin olmalı.');}
   }finally{await handle.close();}
 }
 const result=analyze(input,scheme);process.stdout.write(exportReport(result));process.exitCode=result.checks.every(c=>c.status==='pass')?0:1;
}catch(error){process.stderr.write((error instanceof InputError?error.message:'Dosya okunamadı. Varlığını ve okuma iznini kontrol et.')+'\n');process.exitCode=2;}
