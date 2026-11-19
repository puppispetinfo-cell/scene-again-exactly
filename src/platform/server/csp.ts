import {AsyncLocalStorage} from 'node:async_hooks';
const key=Symbol.for('rivton:csp-nonce-context');
const shared=globalThis as typeof globalThis & {[key]?:AsyncLocalStorage<string>};
const context=shared[key]??=new AsyncLocalStorage<string>();
export const getCspNonce=()=>context.getStore();
export const withCspNonce=<T>(nonce:string,action:()=>T)=>context.run(nonce,action);
