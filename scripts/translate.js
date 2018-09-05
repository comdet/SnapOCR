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
// END
/* eslint-enable */

const config = new Map();

const window = {
  TKK: config.get('TKK') || '0'
};

// eslint-disable-next-line require-jsdoc
function updateTKK() {
  return new Promise(async (resolve, reject) => {
    try {
      let now = Math.floor(Date.now() / 3600000);

      if (Number(window.TKK.split('.')[0]) === now) {
        resolve();
      }
      else {
        let res = await got('GET','https://translate.google.com');
        console.log(res);
        const code = res.body.match(/TKK=(.*?)\(\)\)'\);/g);

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

// eslint-disable-next-line require-jsdoc
async function generate(text) {
  try {
    await updateTKK();

    let tk = zr(text);
    tk = tk.replace('&tk=', '');
    return { name: 'tk', value: tk };
  }
  catch (error) {
    return error;
  }
}

function got(method, url) {
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
        xhr.send();
    });
}