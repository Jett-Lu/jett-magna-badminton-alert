let alarmName = 'poll';

chrome.runtime.onMessage.addListener(function(msg) {
  if (msg.action === 'start') {
    chrome.alarms.clear(alarmName);
    chrome.alarms.create(alarmName, { periodInMinutes: msg.interval/60 });
    chrome.browserAction.setBadgeText({ text: ' ON' });
  }
  else if (msg.action === 'stop') {
    chrome.alarms.clear(alarmName);
    chrome.browserAction.setBadgeText({ text: '' });
  }
});

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name !== alarmName) return;
  chrome.storage.local.get('urls', function(data) {
    const urls = data.urls||[];
    if (!urls.length) return;
    let done=0, labels=[];

    urls.forEach(function(url) {
      chrome.tabs.create({ url:url, active:false }, function(tab) {
        setTimeout(function() {
          chrome.tabs.executeScript(tab.id, {
            code: '('+function(){
              var aE=document.querySelector('.availability, .class-status');
              var avail=aE? aE.textContent.trim() : '';
              var tE=document.querySelector('h1');
              var title=tE? tE.textContent.trim() : '';
              var dE=document.querySelector('.occurrence-date, .occurrenceDate, .date');
              var dt=dE? dE.textContent.trim() : '';
              function pdw(s){
                var m=s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if(!m) return 'Unknown';
                var d=new Date(m[3]+'-'+m[2]+'-'+m[1]);
                return d.toLocaleDateString('en-US',{weekday:'long'});
              }
              var day=pdw(dt);
              var tm=(title.match(/\(([^)]+)\)/)||[])[1]||'';
              var nm=title.split('(')[0].trim();
              return {availability:avail, label: nm+' - '+day+' - ('+tm+')'};
            }+')();'
          }, function(res){
            done++;
            var info=(res&&res[0])||{availability:'',label:''};
            if(info.label) labels.push(info.label);
            if(info.availability&&!/full/i.test(info.availability)){
              chrome.notifications.create({
                type:'basic',
                iconUrl:'icon.png',
                title:'🏸 Spot Open!',
                message:info.label+'\nStatus: '+info.availability
              });
            }
            chrome.tabs.remove(tab.id);
            if(done===urls.length){
              chrome.runtime.sendMessage({ lastChecked: Date.now(), labels: labels });
            }
          });
        },3000);
      });
    });
  });
});
