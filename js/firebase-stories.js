// Firebase Web SDK modular — carregado somente ao publicar ou ler um link online.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { getFirestore, collection, addDoc, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

function configured(){
  if(!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('COLE_') || !firebaseConfig.projectId || firebaseConfig.projectId==='SEU-PROJETO'){
    throw new Error('Configure o arquivo firebase-config.js com os dados do seu projeto Firebase.');
  }
}
let services;
function connection(){
  configured();
  if(!services){
    const app=initializeApp(firebaseConfig);
    services={auth:getAuth(app),db:getFirestore(app)};
  }
  return services;
}
export async function publishStory(payload,name){
  if(typeof payload!=='string' || !/^(gz|raw)\.[A-Za-z0-9_-]+$/.test(payload))throw new Error('História inválida.');
  // O documento Firestore suporta no máximo 1 MiB; reservamos espaço para metadados.
  if(new TextEncoder().encode(payload).length>850000)throw new Error('Esta história é grande demais para o plano atual do Firestore. Remova ou reduza algumas fotos ou áudios.');
  const {auth,db}=connection();
  if(!auth.currentUser)await signInAnonymously(auth);
  const ref=await addDoc(collection(db,'publishedStories'),{
    payload,
    name:String(name||'História').slice(0,120),
    ownerUid:auth.currentUser.uid,
    createdAt:Date.now(),
    version:1
  });
  return ref.id;
}
export async function readPublishedStory(id){
  if(!/^[A-Za-z0-9]{20}$/.test(id))throw new Error('ID inválido.');
  const {db}=connection();
  const snapshot=await getDoc(doc(db,'publishedStories',id));
  if(!snapshot.exists())throw new Error('História não encontrada.');
  const data=snapshot.data();
  if(data.version!==1 || typeof data.payload!=='string')throw new Error('Formato de história não suportado.');
  return {payload:data.payload,name:data.name};
}
