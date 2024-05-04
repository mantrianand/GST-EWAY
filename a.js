(function(){
from = document.querySelector("#txtDateFrom");
to = document.querySelector("#txtDateTo");
outwardradio = document.querySelector("#ctl00_ContentPlaceHolder1_RBL_OutInward_0");
inwardradio = document.querySelector("#ctl00_ContentPlaceHolder1_RBL_OutInward_1");
gstincode = document.querySelector("#ctl00_ContentPlaceHolder1_ddl_gstinstcode");//should be between 1 to 8
gstelement = document.querySelector("#txt_gstin");


hasRequiredElements=from && to && outwardradio && inwardradio && gstelement
if(!hasRequiredElements){
//if none of above elements, then no point going ahead
return;
}
if(hasRequiredElements && !gstincode){
    //gstincode dropdown not seen, get it seen first
    //trying refresh without gst value,
    gstelement.setAttribute("value","29AAACI4798L1ZU") //default infosys gst
    gstelement.dispatchEvent(new Event("change"));
   
}
//will help with resume
if(!inwardradio.checked){
    inwardradio.checked=true;
    inwardradio.dispatchEvent(new Event("click"))
  }


const tr = /<span id="(.*?)">(.*?)<\/span>/g
let gsts = []
let toProcess = []
let start = new Date("01/01/2018")
let end = new Date()
const OI = ["O"] 
const storage = chrome.storage.local
showProgress();
storage.get(["start","end"], r => { start = new Date(r.start);end=new Date(r.end) })
storage.get("gsts", (r) => { gsts = r.gsts; console.log("got gsts", r.gsts) })
storage.get("outward", r => console.log("outward output", r.outward))
storage.get("inward", r => console.log("inward output", r.inward))
const today = new Date();
const f = new FormData(document.forms[0]);
f.append("ctl00$ContentPlaceHolder1$btnsbmt", "GO") // imp line
storage.get("seed").then(r => {
    if (r.seed == "true") {
        setTimeout(() => {
            storeProcessing();
        }, 1);
    }
})

if (from && to && gstincode && gstelement) {
    //do processing
    storage.get("refreshed").then( r => {
        if (r.refreshed == "true") {
             getData();
        }
    })
}

storage.get({ "toProcess": [], "currentIndex": 0, "refreshed": "false" }).then(r => {
    const arr = r.toProcess;
    console.log("current state", r)
    let index = r.currentIndex;
    if (index != 0 && index >= arr.length) {
        //we finished processing
        alert("finished processing");
        //radio check inward and do process for inward from begin
        storage.set({ "finished": "true" });
        storage.get("outward", r => download(r.outward, "outward"))
        storage.get("inward", r => download(r.inward, "inward"))
        storage.set({ currentIndex: 0, toProcess: [],gsts:[] })
        return;


    }
    if (arr.length == 0) {
        return
    }
    if (r.refreshed == "true") {
        return;
    }

    const current = arr[index];
    from.value = current.from;
    to.value = current.to;
    gstelement.value = current.gst;
    gstincode.value = current.i;
    //I have required from filled, now do refresh by triggering change event. Maintain a flag
    storage.set({ "refreshed": "true", "processed": "false", "currentIndex": index });
    gstincode?.dispatchEvent(new Event("change"))
})



function getMonthEnd(dt) {
    const mend = new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
    return mend < end ? mend : end;
}


function storeProcessing() {

    answer = [];
    for (gst of gsts) {
        while (start < end) {
            for (i = 1; i <= 8; i++) {
                for (ward of OI) {
                    st = new Date(start);
                    answer.push({ to: getMonthEnd(st).toLocaleDateString("en-de"), from: st.toLocaleDateString("en-de"), gst, ward, i })
                }
            }
            start.setMonth(start.getMonth() + 1);
            start.setDate(1); //always start from 1st of month
        }

    }
    chrome.storage.local.set({ "toProcess": answer, "seed": "false" })
    gstelement?.dispatchEvent(new Event("change"))

}


async function getData() {
    //its possbile that form got reset for some reason like navigating away or website not working, reset form
    if(gstincode.value=="-1"){
        await set({"refreshed": "false"})
        gstelement.dispatchEvent(new Event("change"));
        return;
    }

    f.set("ctl00$ContentPlaceHolder1$RBL_OutInward", "O")
    const formdata = new URLSearchParams(f.entries()).toString();
    const ow=await fetch(document.URL, { "headers": { "content-type": "application/x-www-form-urlencoded" }, "body": formdata, "method": "POST" });
    f.set("ctl00$ContentPlaceHolder1$RBL_OutInward", "I");
    const formdataInward = new URLSearchParams(f.entries()).toString();
    const iw=await fetch(document.URL, { "headers": { "content-type": "application/x-www-form-urlencoded" }, "body": formdataInward, "method": "POST" });
    const owtxt=await ow.text();
    const iwtxt=await iw.text();
    await populateData(owtxt,"outward");
    await populateData(iwtxt,"inward");
    storage.get("currentIndex", r => { storage.set({ "currentIndex": r.currentIndex + 1, "refreshed": "false" }).then(() => { gstelement.dispatchEvent(new Event("change")); }) })

}


async function populateData(txt, ward) {
    const htmlDoc = new DOMParser().parseFromString(txt, "text/html")
    const rows = htmlDoc.querySelectorAll("tr:has(>td[style])")
    const data = []
    for (row of rows) {
        const spans = row.innerHTML.matchAll(tr)
        obj = {}
        for (span of spans) {
            obj[span[1]] = span[2]
        }
        data.push(obj)
    }
    //flush the data to file or somewhere
    await flush(data, ward);
    return 0;
}

async function flush(data, ward) {
    if (data.length == 0) {
        //do nothing if no data
        return;
    }
   r= await get({ [ward]: [] })
    outward = r[ward].concat(data);
    await set({ [ward]: outward }) ;
    return 0;

}



function download(data, name) {
    let outcome = [];
    const separator = ",";
    const line = ["Sr No", "From GSTIN & Name","To GSTIN & Name", "From Place & Pin","To Place & Pin" ,"EWB No. & Dt.", "Doc No. & Dt.", "Assess Val.", "Tax Val.", "HSN", "HSN Desc.", "Latest Vehicle No."].join(separator);
    outcome.push(line)
    data.map((x, idx) => [++idx, x?.lbl_fromgstin,x?.lbltogstin,x?.lblfromplce,x?.lbl_toplc,x?.lbl_ewbno, x?.lbl_ewbdt, x?.lbl_assvl, x?.lblaxval, x?.lbl_hsn, x?.lbl_hsn_dec, x?.lbl_Vehicle].map(y => typeof y == "string" ? y.replaceAll(",", ";") : y).join(separator)).forEach(y => outcome.push(y));

    ///////////////////Actual download part
    var element = document.createElement('a');
    outcome=[...new Set(outcome)]
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(outcome.join("\r\n")));
    element.setAttribute('download', name + new Date().getTime() + ".csv");
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    //now clear inward and outward data
    storage.set({ "inward": [], "outward": [] })

}


function showProgress() {
    var div = document.createElement('div');
    div.style.display = "hidden";
    div.style.width = "20%";
    div.style.height = "20%";
    div.style.zIndex = 1;
    div.style.position = "absolute";
    div.style.left = "50%";
    div.style.top = "45%"

    storage.get(["currentIndex", "toProcess"]).then(r => {

        if (r.currentIndex > 0 && r.toProcess.length > 0) {
            const p = r.currentIndex / r.toProcess.length
            div.innerText = Number(p * 100).toFixed(2) + "%"
            div.style.display = "block";
            document.body.appendChild(div)
        } else {
            div.style.display = "none"
        }

    })

}


function get(sKey) {
    return new Promise(function(resolve, reject) {
      chrome.storage.local.get(sKey, function(items) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          reject(chrome.runtime.lastError.message);
        } else {
          resolve(items);
        }
      });
    });
  }


  function set(sKey) {
    return new Promise(function(resolve, reject) {
      chrome.storage.local.set(sKey, function() {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          reject(chrome.runtime.lastError.message);
        } else {
          resolve(0);
        }
      });
    });
  }

})();