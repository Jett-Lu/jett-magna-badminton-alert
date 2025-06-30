const startBtn=document.getElementById('startMonitoring'),
stopBtn=document.getElementById('stopMonitoring'),
statusEl=document.getElementById('status'),
lastCheckedEl=document.getElementById('lastChecked');
startBtn.addEventListener('click',()=>{
  const interval=parseInt(document.getElementById('interval').value,10);
  chrome.storage.local.set({interval,active:true},()=>{
    statusEl.textContent='Monitoring...';
    chrome.runtime.sendMessage({action:'start',interval});
  });
});
stopBtn.addEventListener('click',()=>{
  chrome.storage.local.set({active:false},()=>{
    statusEl.textContent='Stopped';
    chrome.runtime.sendMessage({action:'stop'});
  });
});
chrome.storage.local.get(['active','interval'],({active,interval})=>{
  if(active){statusEl.textContent='Monitoring...';document.getElementById('interval').value=interval;}
});
chrome.runtime.onMessage.addListener(msg=>{
  if(msg.lastChecked){lastCheckedEl.textContent=`Last checked: ${new Date(msg.lastChecked).toLocaleTimeString()}`;}
});