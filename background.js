import{checkAvailabilityOnTab}from'./checker.js';
let alarmName='poll';
chrome.runtime.onMessage.addListener(({action,interval})=>{
  if(action==='start'){chrome.alarms.clear(alarmName);chrome.alarms.create(alarmName,{periodInMinutes:interval/60});}
  else if(action==='stop'){chrome.alarms.clear(alarmName);}
});
chrome.alarms.onAlarm.addListener(alarm=>{
  if(alarm.name===alarmName){
    chrome.tabs.query({active:true,currentWindow:true},tabs=>{
      if(!tabs[0])return;
      checkAvailabilityOnTab(tabs[0].id).then(status=>{
        chrome.runtime.sendMessage({lastChecked:Date.now()});
        if(!/full/i.test(status)){
          chrome.notifications.create({
            type:'basic',iconUrl:'icon.png',title:'Spot Open!',message:`Status: ${status}`
          });
          chrome.alarms.clear(alarmName);
        }
      });
    });
  }
});