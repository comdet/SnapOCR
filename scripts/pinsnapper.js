'use strict';

document.body.classList.add('hideNopin');

var support_language = [
    {language : "Thailand", code:"th"},
    {language : "English", code:"en"}
];

var SnapUI = function(options) {
    this.init();
    this.uploadCallback = options.uploadCallback;
    this.completeCallback = options.completeCallback;

    // Bind event callbacks to this object.
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
};
SnapUI.prototype = {
    init: function() {
        this.dragging = false;
        this.div = null;
        this.mask = null;
        this.dimmer = null;
        this.preview = null;
        this.snap = null;
        this.closer = null;
        this.language = null;
        this.x = null;
        this.y = null;
        this.gotPreview = false;
        this.snapCoords = null;
        this.snapCtx = null;
        this.snapImg = null;
    },
    showPreview: function(clientX, clientY, doUpload) {
        this.snapCoords = {
            x: Math.min(this.x, clientX),
            y: Math.min(this.y, clientY),
            w: Math.max(this.x, clientX) - Math.min(this.x, clientX),
            h: Math.max(this.y, clientY) - Math.min(this.y, clientY),
        };

        Math.round(this.snapCoords.w * (this.snapCoords.w / this.snapCoords.h));
        if (!this.snap) {
            this.snap = document.createElement('canvas');
        }
        this.snap.setAttribute('class', 'selection');
        this.snap.setAttribute('width', this.snapCoords.w);
        this.snap.setAttribute('height', this.snapCoords.h);
        this.snap.style.top = this.snapCoords.y - 1 + 'px';
        this.snap.style.left = this.snapCoords.x - 1 + 'px';
        this.div.appendChild(this.snap);
        var self = this;
        this.snap.addEventListener('click', function () {
            self.div.removeChild(this);
            self.gotPreview = false;
        });
        this.snapCtx = this.snap.getContext('2d');
        this.snapCtx.drawImage(this.snapImg,
                               this.snapCoords.x, this.snapCoords.y, this.snapCoords.w, this.snapCoords.h,
                               0, 0, this.snapCoords.w, this.snapCoords.h);

        if (doUpload) {
            /*if(document.getElementById("text-translate")!=null){
                document.getElementById("text-translate").remove();
            };*/
            var lang = document.getElementById("target-lang").value;
            var snapImageData = this.snap.toDataURL('image/jpeg');            
            var top = this.snapCoords.y + window.scrollY;
            var left = this.snapCoords.x + window.scrollX;
            var w = this.snapCoords.w;
            var h = this.snapCoords.h;          
            document.body.innerHTML += '<div id="text-translate" style="color: #000; background-color:white;width: '+w+'px;height: '+h+'px;top: '+top+'px;left: '+left+'px;position: absolute; z-index:10000; font-size: 25px;"><span style="padding:10px">กำลังโหลด รอก่อน</span></div>';
            this.uploadCallback.call(undefined, snapImageData,w,h,top,left,lang);

            // Free references to HTMLElements.
            this.stop();
        }        
        this.gotPreview = true;
    },
    onMouseUp: function(evt) {
        this.dragging = false;
        this.showPreview(evt.clientX, evt.clientY, true);
    },
    onMouseDown: function(evt) {
        this.dragging = true;
        this.closer.classList.add('hidden');
        if (this.snap) {
            this.div.removeChild(this.snap);
            this.snap = null;
        }
        this.x = evt.clientX;
        this.y = evt.clientY;
        this.snapCoords = null;
    },
    onMouseMove: function(evt) {
        if (this.dragging) {
            this.showPreview(evt.clientX, evt.clientY, false);
        }
    },
    stop: function() {
        if (this.div) {
            this.div.remove();
            this.init();
        }

        this.completeCallback();
    },
    beginWithImage: function(snapDataUri, snapImg) {
        this.init();

        this.snapImg = snapImg;

        this.gotPreview = false;
        this.div = document.createElement('div');
        this.div.setAttribute('class', 'pinSnapperOverlay');
        document.body.appendChild(this.div);

        this.mask = document.createElement('div');
        this.mask.setAttribute('class', 'mask');
        this.div.appendChild(this.mask);

        this.dimmer = document.createElement('div');
        this.dimmer.setAttribute('class', 'dimmer');
        this.dimmer.style.backgroundImage = 'url(' + snapDataUri + ')';
        this.div.appendChild(this.dimmer);

        this.closer = document.createElement('div');
        this.closer.setAttribute('class', 'close');
        this.div.appendChild(this.closer);
        

        var selectList = document.createElement("select");
        selectList.setAttribute('class', 'target-language');
        selectList.setAttribute('id', 'target-lang');
        this.div.appendChild(selectList);

        for (var i = 0; i < support_language.length; i++) {
            var option = document.createElement("option");
            option.value = support_language[i].code;
            option.text = support_language[i].language;
            selectList.appendChild(option);
        }

        this.mask.addEventListener('mousedown', this.onMouseDown, false);
        this.mask.addEventListener('mousemove', this.onMouseMove, false);
        this.mask.addEventListener('mouseup', this.onMouseUp, false);

        var self = this;
        this.closer.addEventListener('click', function () {
            self.stop();
        });
    },
    begin: function(screenshotDataUri) {
        // if we're already waiting for a drag, ignore requests.
        if (this.div) {
            return;
        }

        var snapImg = document.createElement('img');
        var self = this;
        snapImg.onload = function() {
            self.beginWithImage(screenshotDataUri, snapImg);
        };
        snapImg.setAttribute('src', screenshotDataUri);
    }
};

var google_api = {
    upload_image : function(image_data,callback){
        image_data = image_data.replace("data:image/jpeg;base64,","");
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            var json = xhr.responseText;                         // Response
            json = json.replace(/^[^(]*\(([\S\s]+)\);?$/, '$1'); // Turn JSONP in JSON
            json = JSON.parse(json);                             // Parse JSON
            var text = json.responses[0].fullTextAnnotation.text;
            callback(text);
        };
        var data = {
            "requests":
                [
                    {
                        "image":{"content":image_data},
                        "features":[
                            {"type":"TYPE_UNSPECIFIED","maxResults":50},
                            {"type":"LANDMARK_DETECTION","maxResults":50},
                            {"type":"FACE_DETECTION","maxResults":50},
                            {"type":"LOGO_DETECTION","maxResults":50},
                            {"type":"LABEL_DETECTION","maxResults":50},
                            {"type":"DOCUMENT_TEXT_DETECTION","maxResults":50},
                            {"type":"SAFE_SEARCH_DETECTION","maxResults":50},
                            {"type":"IMAGE_PROPERTIES","maxResults":50},
                            {"type":"CROP_HINTS","maxResults":50},
                            {"type":"WEB_DETECTION","maxResults":50}
                        ],
                        "imageContext":{"cropHintsParams":{"aspectRatios":[0.8,1,1.2]}}
                    }
                ]
            };

        xhr.open('POST', 'https://cxl-services.appspot.com/proxy?url=https://vision.googleapis.com/v1/images:annotate');
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.send(JSON.stringify(data));
    },
    translate_text : async function(text,target_lang){
        let tk = await google_api.generate_token(text);
        let response = await got(
            "POST",
            "https://translate.google.com/translate_a/single?client=t&sl=auto&tl="+target_lang+
            "&hl="+target_lang+
            "&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&ie=UTF-8&oe=UTF-8&otf=1&ssel=0&tsel=0&kc=7&tk="+tk.value+
            "&q="+encodeURIComponent(text),
            {q : text}
        );
        let result = "";
        let body = JSON.parse(response);
        body[0].forEach((obj) => {
            if (obj[0]) {
                result += obj[0];
            }
        });
        return result;
    },
    generate_token : async function(text){
        try {
            await updateTKK();
            let tk = zr(text);
            tk = tk.replace('&tk=', '');
            return { name: 'tk', value: tk };
        }catch (error) {
            return error;
        }
    }
};

if (!window.snapUI) {
    window.snapUI = new SnapUI({
        uploadCallback: async function(imageDataUri,w,h,top,left,target_lang) {
            google_api.upload_image(imageDataUri,async function(text){                
                let transtext = await google_api.translate_text(text,target_lang);
                if(document.getElementById("text-translate")!=null){
                    document.getElementById("text-translate").remove();
                }
                document.body.innerHTML += '<div style="background-color:white; color:#000; width: '+w+'px;height: '+h+'px;top: '+top+'px;left: '+left+'px;position: absolute; z-index:10000; font-size: 25px;"><span style="padding:10px">'+transtext+'</span></div>';                
            });
        },
        completeCallback: function() {
            document.body.classList.remove('hideNopin');
            document.body.classList.remove('pinSnapperOverlay');
            document.getElementsByClassName("pinSnapperOverlay")[0].remove();            
        }
    });

    chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
        console.log('extension.onRequest action', request.action);
        if ('pinSnap' === request.action) {            
            window.snapUI.begin(request.screenshotDataUri);
        }
        sendResponse({
            response: 'hello'
        });
    });
}


function zr(a) {
  let b;
  if (null !== yr) b = yr;
  else {
    b = wr(String.fromCharCode(84));
    let c = wr(String.fromCharCode(75));
    b = [ b(), b() ];
    b[1] = c();
    b = (yr = window[b.join(c())] || '') || '';
  }
  let d = wr(String.fromCharCode(116));
  let c = wr(String.fromCharCode(107));
  d = [ d(), d() ];
  d[1] = c();
  c = '&' + d.join('') + '=';
  d = b.split('.');
  b = Number(d[0]) || 0;
  // eslint-disable-next-line no-var
  for (var e = [], f = 0, g = 0; g < a.length; g++) {
    let l = a.charCodeAt(g);
    128 > l ? e[f++] = l : (2048 > l ? e[f++] = l >> 6 | 192 : ((l & 64512) == 55296 && g + 1 < a.length && (a.charCodeAt(g + 1) & 64512) == 56320 ? (l = 65536 + ((l & 1023) << 10) + (a.charCodeAt(++g) & 1023), e[f++] = l >> 18 | 240, e[f++] = l >> 12 & 63 | 128) : e[f++] = l >> 12 | 224, e[f++] = l >> 6 & 63 | 128), e[f++] = l & 63 | 128);
  }
  a = b;
  for (let f = 0; f < e.length; f++) a += e[f], a = xr(a, '+-a^+6');
  a = xr(a, '+-3^+b+-f');
  a ^= Number(d[1]) || 0;
  0 > a && (a = (a & 2147483647) + 2147483648);
  a %= 1E6;
  return c + (a.toString() + '.' + (a ^ b));
}

let yr = null;
let wr = function(a) {
  return function() {
    return a;
  };
};
let xr = function(a, b) {
  for (let c = 0; c < b.length - 2; c += 3) {
    let d = b.charAt(c + 2);
    d = d >= 'a' ? d.charCodeAt(0) - 87 : Number(d);
    d = b.charAt(c + 1) == '+' ? a >>> d : a << d;
    a = b.charAt(c) == '+' ? a + d & 4294967295 : a ^ d;
  }
  return a;
};

//=============================================//
//----------- GG Translate sneaked-API --------//
// from https://github.com/k3rn31p4nic/google-translate-api/
const config = new Map();
const windows = {
  TKK: config.get('TKK') || '0'
};

// eslint-disable-next-line require-jsdoc
function updateTKK() {
  return new Promise(async (resolve, reject) => {
    try {
      let now = Math.floor(Date.now() / 3600000);

      if (Number(windows.TKK.split('.')[0]) === now) {
        resolve();
      }
      else {
        var TKK = null;
        let res = await got('GET','https://translate.google.com');
        //console.log(res);
        const code = res.match(/TKK=(.*?)\(\)\)'\);/g);

        if (code) {
          eval(code[0]);
          /* eslint-disable no-undef */
          if (typeof TKK !== 'undefined') {
            window.TKK = TKK;
            config.set('TKK', TKK);
          }
          /* eslint-enable no-undef */
        }

        /**
        * Note: If the regex or the eval fail, there is no need to worry. The
        * server will accept relatively old seeds.
        */

        resolve();
      }
    }
    catch (e) {
      if (e.name === 'HTTPError') {
        let error = new Error();
        error.name = e.name;
        error.statusCode = e.statusCode;
        error.statusMessage = e.statusMessage;
        reject(error);
      }
      reject(e);
    }
  });
}

function got(method, url, data) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        if(method == 'POST'){
            xhr.send(data);
        }else{
            xhr.send();
        }
    });
}