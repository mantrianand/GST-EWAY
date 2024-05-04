
  
  function injectTheScript() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({target:{tabId:tabs[0].id},func:saveGST,args:[document.getElementById('input').value,document.getElementById('dt').value,document.getElementById("dtend").value]});
    });}

  function closeWindow(){
    setTimeout(() => {
      window.close()
    }, 2000);
  }
  chrome.storage.local.get({"currentIndex":0},r=>{if(r.currentIndex > 0 ){document.getElementById('submit').setAttribute("disabled",true)}})
  const dateinput=document.getElementById("dt");
  const enddateinput=document.getElementById("dtend");
  const todayAsString=new Date().toISOString().substring(0,10);
  dateinput.setAttribute("max",todayAsString)
  enddateinput.setAttribute("max",todayAsString)
  chrome.storage.local.get({"start":"2018-01-01"},r=>{if(Object.keys(r.start).length>0)dateinput.value=new Date(r.start).toISOString().substring(0,10)})
  chrome.storage.local.get({"end":"2014-01-01"},r=>{if(Object.keys(r.end).length>0)enddateinput.value=new Date(r.end).toISOString().substring(0,10)})
  document.getElementById('submit').addEventListener('click', injectTheScript);
  document.getElementById('submit').addEventListener('click', closeWindow);



  function saveGST(someTextWithGST,begin,end){
      const gstRegex=/[0-9]{2}[A-Z]{3}[ABCFGHLJPTF]{1}[A-Z]{1}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/g;
          gsts=someTextWithGST.match(gstRegex)
          if(gsts){
            chrome.storage.local.set({"gsts":gsts,"seed":"true","process":"outward","outward":[],"inward":[],"start":begin,"end":end});
          }else{
            alert("No valid GST number found, not processing");return
          }
          
          gstelement = document.querySelector("#txt_gstin");
          inwardradio = document.querySelector("#ctl00_ContentPlaceHolder1_RBL_OutInward_1");
          
          if(!inwardradio.checked){
            inwardradio.checked=true;
            inwardradio.dispatchEvent(new Event("click"))
          }else{
            gstelement.dispatchEvent(new Event("change"))
          }
          
  }

  