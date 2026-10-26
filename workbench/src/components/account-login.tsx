"use client";
import {useEffect,useState} from 'react';
import {accountClient} from '@/client/account-auth';
export function AccountLogin({sessionKey,callback=false}:{sessionKey:string;callback?:boolean}) {
  const [message,setMessage]=useState(callback?'正在恢复登录 / Completing sign-in':'使用已有 MiaoCut 账户 / Use your existing account');
  const [busy,setBusy]=useState(callback);
  const [sessionEmail,setSessionEmail]=useState<string|null>(null);
  useEffect(()=>{
    const client=accountClient(sessionKey);
    if(!callback){
      let active=true;
      if(client)void client.auth.getSession().then(({data})=>{if(active)setSessionEmail(data.session?.user.email||null);});
      return()=>{active=false;};
    }
    if(!client){setTimeout(()=>{setMessage('登录服务尚未配置 / Sign-in is not configured');setBusy(false);},0);return;}
    let active=true;
    void client.auth.getSession().then(({data,error})=>{
      if(!active)return;
      if(!error&&data.session)window.location.replace('/workbench/product/internal');
      else {setMessage('登录未完成，请重试 / Sign-in did not complete');setBusy(false);}
    });return()=>{active=false;};
  },[callback,sessionKey]);
  const login=async(provider:'google'|'github'|'azure')=>{
    const client=accountClient(sessionKey);
    if(!client){setMessage('登录服务尚未配置 / Sign-in is not configured');return;}
    setBusy(true);
    const {error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:window.location.origin+'/workbench/auth/callback',
      ...(provider==='azure'?{scopes:'email openid profile',queryParams:{prompt:'select_account'}}:provider==='google'?{queryParams:{prompt:'select_account'}}:{})}});
    if(error){setMessage('暂时无法登录，请重试 / Unable to sign in');setBusy(false);}
  };
  return <main className="workspace-main" style={{maxWidth:560,paddingTop:80}}><h1>MiaoCut</h1><p role="status">{message}</p>
    <p>沿用原账户与积分。请选择原账户使用的登录方式。<br/>Your existing account and credits stay together. Use the same sign-in provider.</p>
    {sessionEmail?<p>当前浏览器账号 / Current account: <strong>{sessionEmail}</strong><br/>使用下面的登录方式切换账号。 / Sign in below to switch accounts.</p>:null}
    <div className="panel-section">{(['google','github','azure'] as const).map(p=><button key={p} type="button" className="sample-button" disabled={busy} onClick={()=>void login(p)}>{p==='azure'?'Microsoft':p==='github'?'GitHub':'Google'}</button>)}</div>
    <a href="/workbench/product/internal">返回工作台 / Back to workspace</a></main>;
}
