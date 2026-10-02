import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

// Compare with the last successful deployment, not HEAD^: one push may contain
// an undeployed code change followed by a documentation commit.
export function docsOnlyBuild({previousSha,currentSha,cwd=process.cwd()}){
 if(!/^[a-f0-9]{40}$/i.test(previousSha??'')||!/^[a-f0-9]{40}$/i.test(currentSha??''))return{skip:false,reason:'No verified deployment baseline; build required'};
 const diff=spawnSync('git',['diff','--name-only','--no-renames','-z',previousSha,currentSha,'--'],{cwd,encoding:'utf8'});
 if(diff.error||diff.status!==0)return{skip:false,reason:'Git history unavailable; build required'};
 const paths=diff.stdout.split('\0').filter(Boolean);
 const skip=paths.length>0&&paths.every(p=>p.startsWith('docs/')||p.startsWith('design/qa/'));
 return{skip,reason:skip?'Only documentation/QA reports changed since the deployed game':'Game, configuration, other files or explicit redeploy; build required',paths};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const result=docsOnlyBuild({previousSha:process.env.VERCEL_GIT_PREVIOUS_SHA,currentSha:process.env.VERCEL_GIT_COMMIT_SHA});
 console.log(result.reason);
 // Vercel's ignoreCommand contract: 0 skips, 1 continues the build.
 process.exit(result.skip?0:1);
}
