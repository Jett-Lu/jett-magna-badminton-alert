export async function checkAvailabilityOnTab(tabId){
  const[{result:status}]=await chrome.scripting.executeScript({
    target:{tabId},func:()=>{const el=document.querySelector('.availability, .class-status');return el?el.textContent.trim():'';}
  });
  return status;
}